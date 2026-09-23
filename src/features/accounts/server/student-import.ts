import { createHash } from 'node:crypto';
import { Prisma, type StudentImportRowOutcome } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '@/shared/server/session';
import { createAccountSchema } from '@/features/accounts/schemas';
import { normalizeImportPhone, parseCsv, type StudentImportField } from '@/features/accounts/csv/parse-student-csv';
import { prisma } from '@/shared/lib/prisma';
import { updateAccountProfileTx } from './account-actions';

const mappingSchema = z.object({
  name: z.string().trim().min(1).nullable(),
  email: z.string().trim().min(1).nullable(),
  phone: z.string().trim().min(1).nullable(),
  referralSource: z.string().trim().min(1).nullable(),
}).strict();
const csvRequestSchema = z.object({ csvText: z.string().min(1), mapping: mappingSchema }).strict();
const rowActionSchema = z.object({
  rowNumber: z.number().int().min(2),
  action: z.enum(['CREATE', 'UPDATE', 'MATCH', 'SKIP']),
  expectedMatchUserId: z.string().min(1).optional(),
});
const confirmRequestSchema = csvRequestSchema.extend({
  planDigest: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.string().uuid(),
  rowActions: z.array(rowActionSchema).max(500),
}).strict();

type Candidate = {
  rowNumber: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: 'READY' | 'MATCHED' | 'CONFLICT' | 'INVALID';
  reasonCode: string | null;
  matchedUserId: string | null;
  matchedName: string | null;
  matchedEmail: string | null;
  matchedPhone: string | null;
  matchedReferralSourceName: string | null;
  referralSourceId: string | null;
  referralSourceName: string | null;
  referralSourceMapped: boolean;
  changes: Array<{ field: 'name' | 'email' | 'phone' | 'source'; current: string | null; next: string | null }>;
};
type MappedCandidate = Candidate & { referralSourceInput: string | null };
type ImportMatch = { id: string; role: string; name: string | null; email: string | null; phone: string | null; referral_source_id: string | null; referral_source_name: string | null };
type ImportDb = Pick<Prisma.TransactionClient, '$queryRaw' | 'referralSource'>;

function cleanCell(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function candidateRows(csvText: string, rawMapping: unknown) {
  const mapping = mappingSchema.parse(rawMapping);
  const csv = parseCsv(csvText);
  const mappedColumns = Object.values(mapping).filter((value): value is string => Boolean(value));
  if (new Set(mappedColumns).size !== mappedColumns.length) throw new Error('Map each CSV column to only one account field');
  if (!mapping.email && !mapping.phone) throw new Error('Map an email or phone column so existing accounts can be checked safely');
  for (const header of mappedColumns) {
    if (!csv.headers.includes(header)) throw new Error('A mapped CSV header is no longer present');
  }
  const headerIndexes = Object.fromEntries(csv.headers.map((header, index) => [header, index])) as Record<string, number>;

  const rows: MappedCandidate[] = csv.rows.map(({ rowNumber, values }) => {
    const valuesByField = {} as Record<StudentImportField, string | null>;
    for (const field of ['name', 'email', 'phone'] as const) {
      const header = mapping[field];
      valuesByField[field] = header ? cleanCell(values[headerIndexes[header]]) : null;
    }
    if (valuesByField.email) valuesByField.email = valuesByField.email.toLocaleLowerCase('en');
    const profile = Object.fromEntries(Object.entries(valuesByField).filter(([, value]) => value !== null));
    const validation = createAccountSchema.safeParse({ role: 'STUDENT', ...profile });
    const hasIdentity = Boolean(valuesByField.email || valuesByField.phone);
    const invalidEmail = Boolean(valuesByField.email && !z.string().email().safeParse(valuesByField.email).success);
    const invalidPhone = Boolean(valuesByField.phone && (!normalizeImportPhone(valuesByField.phone) || valuesByField.phone.length > 40 || /[\u0000-\u001f\u007f]/.test(valuesByField.phone)));
    const invalidName = Boolean(valuesByField.name && (valuesByField.name.length > 120 || /[\u0000-\u001f\u007f]/.test(valuesByField.name)));
    const invalid = !hasIdentity || !validation.success || invalidEmail || invalidPhone || invalidName;
    return {
      rowNumber,
      name: valuesByField.name,
      email: valuesByField.email,
      phone: valuesByField.phone,
      status: invalid ? 'INVALID' : 'READY',
      reasonCode: !hasIdentity ? 'missing_identity' : invalidEmail ? 'invalid_email' : invalidPhone ? valuesByField.phone && valuesByField.phone.length > 40 ? 'phone_too_long' : 'invalid_phone' : invalidName ? valuesByField.name && valuesByField.name.length > 120 ? 'name_too_long' : 'invalid_name' : !validation.success ? 'invalid_student_profile' : null,
      matchedUserId: null,
      matchedName: null,
      matchedEmail: null,
      matchedPhone: null,
      matchedReferralSourceName: null,
      changes: [],
      referralSourceId: null,
      referralSourceName: null,
      referralSourceMapped: Boolean(mapping.referralSource),
      referralSourceInput: mapping.referralSource ? cleanCell(values[headerIndexes[mapping.referralSource]]) : null,
    } satisfies MappedCandidate;
  });

  const emailRows = new Map<string, number[]>();
  const phoneRows = new Map<string, number[]>();
  const addIndex = (index: Map<string, number[]>, key: string | null, rowNumber: number) => {
    if (!key) return;
    index.set(key, [...(index.get(key) ?? []), rowNumber]);
  };
  for (const row of rows) {
    if (row.status !== 'READY') continue;
    addIndex(emailRows, row.email, row.rowNumber);
    const phone = row.phone ? normalizeImportPhone(row.phone) : '';
    addIndex(phoneRows, phone || null, row.rowNumber);
  }
  const duplicateRowNumbers = new Set<number>();
  for (const indexes of [emailRows, phoneRows]) {
    for (const rowNumbers of indexes.values()) if (rowNumbers.length > 1) rowNumbers.forEach((rowNumber) => duplicateRowNumbers.add(rowNumber));
  }
  for (const row of rows) {
    if (duplicateRowNumbers.has(row.rowNumber)) {
      row.status = 'CONFLICT';
      row.reasonCode = 'duplicate_csv_identity';
    }
  }
  return rows;
}

async function resolveReferralSources(db: ImportDb, rows: MappedCandidate[]) {
  if (!rows.some((row) => row.referralSourceMapped && row.status !== 'INVALID' && row.status !== 'CONFLICT')) return;
  const activeSources = await db.referralSource.findMany({
    where: { is_active: true },
    select: { id: true, name: true, normalized_name: true },
  });
  for (const row of rows) {
    if (!row.referralSourceMapped || row.status === 'INVALID' || row.status === 'CONFLICT') continue;
    const value = row.referralSourceInput?.replace(/\s+/g, ' ').trim() ?? '';
    if (!value || value.toLocaleLowerCase('en') === 'none') {
      row.referralSourceId = null;
      row.referralSourceName = 'None';
      continue;
    }
    const normalized = value.toLocaleLowerCase('en');
    const matches = activeSources.filter((source) => source.id === value || source.normalized_name === normalized);
    if (matches.length !== 1) {
      row.status = 'INVALID';
      row.reasonCode = matches.length ? 'ambiguous_referral_source' : 'unknown_referral_source';
      continue;
    }
    row.referralSourceId = matches[0].id;
    row.referralSourceName = matches[0].name;
  }
}

async function matchingAccounts(db: ImportDb, rows: Candidate[]) {
  const emails = [...new Set(rows.flatMap((row) => row.status === 'READY' && row.email ? [row.email] : []))];
  const phones = [...new Set(rows.flatMap((row) => {
    if (row.status !== 'READY' || !row.phone) return [];
    const digits = normalizeImportPhone(row.phone);
    return digits ? [digits] : [];
  }))];
  if (!emails.length && !phones.length) return [] as ImportMatch[];
  const emailClause = emails.length
    ? Prisma.sql`lower(u."email") IN (${Prisma.join(emails)})`
    : Prisma.sql`FALSE`;
  const phoneClause = phones.length
    ? Prisma.sql`regexp_replace(coalesce(u."phone", ''), '[^0-9]', '', 'g') IN (${Prisma.join(phones)}) AND regexp_replace(coalesce(u."phone", ''), '[^0-9]', '', 'g') <> ''`
    : Prisma.sql`FALSE`;
  return db.$queryRaw<ImportMatch[]>(Prisma.sql`
    SELECT u."id", u."role"::text AS "role", u."name", u."email", u."phone", u."referral_source_id", s."name" AS "referral_source_name"
    FROM "User" u
    LEFT JOIN "ReferralSource" s ON s."id" = u."referral_source_id"
    WHERE (${emailClause}) OR (${phoneClause})
  `);
}

async function evaluateRows(db: ImportDb, csvText: string, mapping: unknown) {
  const rows = candidateRows(csvText, mapping);
  await resolveReferralSources(db, rows);
  const matches = await matchingAccounts(db, rows);
  for (const row of rows) {
    if (row.status !== 'READY') continue;
    const phoneDigits = row.phone ? normalizeImportPhone(row.phone) : '';
    const found = matches.filter((match) =>
      (row.email && match.email?.toLocaleLowerCase('en') === row.email) ||
      (phoneDigits && normalizeImportPhone(match.phone ?? '') === phoneDigits),
    );
    const ids = [...new Set(found.map((match) => match.id))];
    if (ids.length > 1) {
      row.status = 'CONFLICT';
      row.reasonCode = 'identity_matches_different_accounts';
      continue;
    }
    if (ids.length === 1) {
      const match = found.find(({ id }) => id === ids[0])!;
      if (match.role !== 'STUDENT') {
        row.status = 'CONFLICT';
        row.reasonCode = 'identity_matches_non_student';
        row.matchedUserId = match.id;
        continue;
      }
      row.status = 'MATCHED';
      row.matchedUserId = match.id;
      row.matchedName = match.name;
      row.matchedEmail = match.email;
      row.matchedPhone = match.phone;
      row.matchedReferralSourceName = match.referral_source_name;
      if (row.name && row.name !== match.name) row.changes.push({ field: 'name', current: match.name, next: row.name });
      if (row.email && row.email !== match.email?.toLocaleLowerCase('en')) row.changes.push({ field: 'email', current: match.email, next: row.email });
      if (row.phone && row.phone !== match.phone) row.changes.push({ field: 'phone', current: match.phone, next: row.phone });
      if (row.referralSourceMapped && row.referralSourceId !== match.referral_source_id) {
        row.changes.push({ field: 'source', current: match.referral_source_name || 'None', next: row.referralSourceName || 'None' });
      }
    }
  }
  const digestInput = rows.map(({ rowNumber, name, email, phone, referralSourceId, status, reasonCode, matchedUserId }) => ({ rowNumber, name, email, phone, referralSourceId, status, reasonCode, matchedUserId }));
  const planDigest = createHash('sha256').update(JSON.stringify({ mapping, rows: digestInput })).digest('hex');
  const safeRows = rows.map(({ referralSourceInput: _sourceInput, ...row }) => row);
  return { rows: safeRows, planDigest };
}

function counts(rows: Array<{ outcome: StudentImportRowOutcome | Candidate['status'] }>) {
  return rows.reduce((summary, row) => {
    if (row.outcome === 'CREATED') summary.created += 1;
    else if (row.outcome === 'UPDATED') summary.updated += 1;
    else if (row.outcome === 'MATCHED') summary.matched += 1;
    else if (row.outcome === 'SKIPPED') summary.skipped += 1;
    else if (row.outcome === 'CONFLICT') summary.conflicts += 1;
    else if (row.outcome === 'INVALID') summary.errors += 1;
    return summary;
  }, { created: 0, updated: 0, matched: 0, skipped: 0, conflicts: 0, errors: 0 });
}

export async function previewStudentImport(input: unknown) {
  await requireAuth(['ADMIN']);
  const parsed = csvRequestSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid Student import request');
  const plan = await evaluateRows(prisma, parsed.data.csvText, parsed.data.mapping);
  return {
    planDigest: plan.planDigest,
    rows: plan.rows,
    counts: {
      ready: plan.rows.filter((row) => row.status === 'READY').length,
      matched: plan.rows.filter((row) => row.status === 'MATCHED').length,
      conflicts: plan.rows.filter((row) => row.status === 'CONFLICT').length,
      errors: plan.rows.filter((row) => row.status === 'INVALID').length,
    },
  };
}

export async function confirmStudentImport(input: unknown) {
  const admin = await requireAuth(['ADMIN']);
  const parsed = confirmRequestSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid Student import confirmation');
  const request = parsed.data;

  try {
    return await prisma.$transaction(async (tx) => {
      const previous = await tx.studentImportBatch.findUnique({
        where: { idempotency_key: request.idempotencyKey },
        include: { rows: { select: { outcome: true } } },
      });
      if (previous) {
        if (previous.created_by_user_id !== admin.userId) throw new Error('This import confirmation key is unavailable');
        return { batchId: previous.id, ...counts(previous.rows) };
      }

      const plan = await evaluateRows(tx, request.csvText, request.mapping);
      if (plan.planDigest !== request.planDigest) throw new Error('Accounts changed after preview; preview the CSV again before confirming');
      if (request.rowActions.length !== plan.rows.length || new Set(request.rowActions.map(({ rowNumber }) => rowNumber)).size !== plan.rows.length) {
        throw new Error('Choose an action for every preview row');
      }
      const actions = new Map(request.rowActions.map((rowAction) => [rowAction.rowNumber, rowAction]));
      for (const row of plan.rows) {
        const action = actions.get(row.rowNumber);
        if (!action) throw new Error('Choose an action for every preview row');
        if (row.status === 'READY' && action.action !== 'CREATE' && action.action !== 'SKIP') throw new Error('A new row can only be created or skipped');
        if (row.status === 'MATCHED') {
          if (!['UPDATE', 'MATCH', 'SKIP'].includes(action.action) || (action.action !== 'SKIP' && action.expectedMatchUserId !== row.matchedUserId)) {
            throw new Error('A matched row changed; preview the CSV again');
          }
        }
        if ((row.status === 'CONFLICT' || row.status === 'INVALID') && action.action !== 'SKIP') {
          throw new Error('Conflicting or invalid rows must be skipped');
        }
      }

      const batch = await tx.studentImportBatch.create({
        data: { idempotency_key: request.idempotencyKey, created_by_user_id: admin.userId, row_count: plan.rows.length },
        select: { id: true },
      });
      const outcomes: Array<{ row_number: number; outcome: StudentImportRowOutcome; reason_code: string | null; matched_user_id: string | null }> = [];
      for (const row of plan.rows) {
        const action = actions.get(row.rowNumber)!;
        let outcome: StudentImportRowOutcome;
        let reasonCode = row.reasonCode;
        let matchedUserId = row.matchedUserId;
        if (action.action === 'SKIP') {
          outcome = row.status === 'CONFLICT' ? 'CONFLICT' : row.status === 'INVALID' ? 'INVALID' : 'SKIPPED';
          reasonCode = outcome === 'SKIPPED' ? 'admin_skipped' : row.reasonCode;
        } else if (action.action === 'CREATE' && row.status === 'READY') {
          const created = await tx.user.create({
            data: {
              role: 'STUDENT',
              account_status: 'PENDING_CREDENTIALS',
              password_hash: null,
              name: row.name,
              email: row.email,
              phone: row.phone,
              referral_source_id: row.referralSourceId,
            },
            select: { id: true },
          });
          matchedUserId = created.id;
          outcome = 'CREATED';
          reasonCode = null;
        } else if (action.action === 'UPDATE' && row.status === 'MATCHED' && row.matchedUserId) {
          await updateAccountProfileTx(tx, row.matchedUserId, {
            ...(row.name ? { name: row.name } : {}),
            ...(row.email ? { email: row.email } : {}),
            ...(row.phone ? { phone: row.phone } : {}),
            ...(row.referralSourceMapped ? { referralSourceId: row.referralSourceId } : {}),
          });
          outcome = 'UPDATED';
          reasonCode = null;
        } else if (action.action === 'MATCH' && row.status === 'MATCHED') {
          outcome = 'MATCHED';
          reasonCode = null;
        } else {
          outcome = row.status === 'INVALID' ? 'INVALID' : 'CONFLICT';
        }
        outcomes.push({ row_number: row.rowNumber, outcome, reason_code: reasonCode, matched_user_id: matchedUserId });
      }
      await tx.studentImportRow.createMany({ data: outcomes.map((outcome) => ({ batch_id: batch.id, ...outcome })) });
      return { batchId: batch.id, ...counts(outcomes.map(({ outcome }) => ({ outcome }))) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000, maxWait: 10_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const previous = await prisma.studentImportBatch.findUnique({
        where: { idempotency_key: request.idempotencyKey },
        include: { rows: { select: { outcome: true } } },
      });
      if (previous?.created_by_user_id === admin.userId) return { batchId: previous.id, ...counts(previous.rows) };
    }
    throw error;
  }
}
