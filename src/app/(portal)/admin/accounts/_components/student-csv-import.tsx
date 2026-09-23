'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { confirmAdminStudentImport, previewAdminStudentImport } from '../actions';
import { parseCsv, type StudentImportField } from '@/features/accounts/csv/parse-student-csv';

type Mapping = Record<StudentImportField | 'referralSource', string | null>;
type PreviewRow = {
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
  referralSourceName: string | null;
  changes: Array<{ field: 'name' | 'email' | 'phone' | 'source'; current: string | null; next: string | null }>;
};
type RowAction = 'CREATE' | 'UPDATE' | 'MATCH' | 'SKIP';
type Preview = { planDigest: string; rows: PreviewRow[]; counts: { ready: number; matched: number; conflicts: number; errors: number } };

const fields: Array<{ key: keyof Mapping; label: string }> = [
  { key: 'name', label: 'Student name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'referralSource', label: 'Student source (optional)' },
];

function reasonLabel(code: string | null) {
  const labels: Record<string, string> = {
    duplicate_csv_identity: 'This email or phone is repeated in the file.',
    identity_matches_different_accounts: 'Email and phone match different accounts.',
    identity_matches_non_student: 'Email or phone belongs to a non-Student account.',
    missing_identity: 'An email or phone is required for safe matching.',
    invalid_email: 'Email format is invalid.',
    phone_too_long: 'Phone number is too long.',
    invalid_phone: 'Phone number contains invalid characters.',
    name_too_long: 'Name is too long.',
    invalid_name: 'Name contains invalid control characters.',
    invalid_student_profile: 'Student details could not be validated.',
    unknown_referral_source: 'Student source does not match an active source name or ID.',
    ambiguous_referral_source: 'Student source matches more than one active source.',
  };
  return code ? labels[code] ?? 'Review this row.' : '';
}

function RowActionSelect({ row, value, onChange }: { row: PreviewRow; value: RowAction; onChange: (value: RowAction) => void }) {
  return (
    <label className="block min-w-0 text-xs font-semibold text-text-muted">
      Row action
      <select aria-label={`Action for CSV row ${row.rowNumber}`} value={value} onChange={(event) => onChange(event.target.value as RowAction)} className="mt-1 min-h-[44px] w-full rounded-lg border border-border-strong bg-canvas px-2 text-sm text-text-primary">
        {row.status === 'READY' && <option value="CREATE">Create account</option>}
        {row.status === 'MATCHED' && <><option value="MATCH">Keep matched account</option><option value="UPDATE">Update matched account</option></>}
        {(row.status === 'CONFLICT' || row.status === 'INVALID') && <option value="SKIP">Skip row</option>}
        {(row.status === 'READY' || row.status === 'MATCHED') && <option value="SKIP">Skip row</option>}
      </select>
    </label>
  );
}

function StudentRowDetails({ row }: { row: PreviewRow }) {
  return (
    <div className="min-w-0 break-words text-sm text-text-primary">
      <p className="font-semibold">{row.name || 'Name not provided'}</p>
      <p className="mt-1 break-all text-xs text-text-muted">{row.email || 'No email'} · {row.phone || 'No phone'}</p>
      {row.status === 'MATCHED' ? (
        <div className="mt-3 rounded-lg border border-border-subtle bg-canvas-subtle p-3 text-xs text-text-muted">
          <p className="font-semibold text-text-primary">Existing Student: {row.matchedName || 'Profile incomplete'}</p>
          <p className="mt-1 break-all">Current: {row.matchedEmail || 'No email'} · {row.matchedPhone || 'No phone'} · Source: {row.matchedReferralSourceName || 'None'}</p>
          {row.changes.length ? <ul className="mt-2 space-y-1 border-l-2 border-brand-border pl-2">{row.changes.map((change) => <li key={change.field}><span className="font-semibold capitalize text-text-primary">{change.field}</span>: <span className="break-all">{change.current || 'None'} → {change.next || 'None'}</span></li>)}</ul> : <p className="mt-1">No mapped field changes.</p>}
        </div>
      ) : row.status === 'READY' ? <p className="mt-2 text-xs text-text-muted">New pending-credentials Student · Source: {row.referralSourceName || 'None'}</p> : <p className="mt-2 text-xs text-text-muted">{reasonLabel(row.reasonCode)}</p>}
    </div>
  );
}

export function StudentCsvImport() {
  const router = useRouter();
  const [fileName, setFileName] = React.useState('');
  const [csvText, setCsvText] = React.useState('');
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [mapping, setMapping] = React.useState<Mapping>({ name: null, email: null, phone: null, referralSource: null });
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [actions, setActions] = React.useState<Record<number, RowAction>>({});
  const [confirmed, setConfirmed] = React.useState(false);
  const [confirmKey, setConfirmKey] = React.useState('');
  const [reviewed, setReviewed] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [isPending, startTransition] = React.useTransition();

  async function chooseFile(file?: File) {
    setError('');
    setMessage('');
    setPreview(null);
    setConfirmed(false);
    setReviewed(false);
    setConfirmKey('');
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setFileName(file.name);
      setCsvText(text);
      setHeaders(parsed.headers);
      setMapping({ name: null, email: null, phone: null, referralSource: null });
    } catch (reason) {
      setFileName('');
      setCsvText('');
      setHeaders([]);
      setError(reason instanceof Error ? reason.message : 'Could not read this CSV file.');
    }
  }

  function setFieldMapping(field: keyof Mapping, value: string) {
    setMapping((current) => ({ ...current, [field]: value || null }));
  }

  function requestPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    startTransition(async () => {
      try {
        const nextPreview = await previewAdminStudentImport({ csvText, mapping });
        setPreview(nextPreview as Preview);
        setActions(Object.fromEntries(nextPreview.rows.map((row: PreviewRow) => [row.rowNumber, row.status === 'READY' ? 'CREATE' : row.status === 'MATCHED' ? 'MATCH' : 'SKIP'])));
        setReviewed(false);
        setConfirmed(false);
        setConfirmKey(crypto.randomUUID());
      } catch (reason) {
        setPreview(null);
        setError(reason instanceof Error ? reason.message : 'Could not preview this import.');
      }
    });
  }

  function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview || !reviewed) return;
    setError('');
    setMessage('');
    startTransition(async () => {
      try {
        const rowActions = preview.rows.map((row) => ({
          rowNumber: row.rowNumber,
          action: actions[row.rowNumber] ?? 'SKIP',
          ...(row.matchedUserId ? { expectedMatchUserId: row.matchedUserId } : {}),
        }));
        const result = await confirmAdminStudentImport({
          csvText,
          mapping,
          planDigest: preview.planDigest,
          idempotencyKey: confirmKey || crypto.randomUUID(),
          rowActions,
        });
        setConfirmed(true);
        setMessage(`Import recorded: ${result.created} created, ${result.updated} updated, ${result.matched} matched, ${result.skipped} skipped, ${result.conflicts} conflicts, ${result.errors} invalid.`);
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not confirm this import.');
      }
    });
  }

  const mappedHeaderCount = new Set(Object.values(mapping).filter(Boolean)).size;

  return (
    <section className="rounded-2xl border border-border-subtle bg-canvas shadow-xs">
      <div className="border-b border-border-subtle px-5 py-4">
        <h2 className="text-base font-semibold text-text-primary">Import Students from CSV</h2>
        <p className="mt-1 text-sm text-text-muted">Preview and map columns to safe account fields. New accounts start without credentials; issue setup links from each account after import.</p>
      </div>
      <div className="space-y-5 p-5">
        <label className="block text-sm font-medium text-text-primary">
          CSV file (1 MB, up to 500 rows)
          <input type="file" accept=".csv,text/csv" onChange={(event) => void chooseFile(event.target.files?.[0])} className="mt-2 block min-h-[52px] w-full rounded-lg border border-border-strong bg-canvas px-3 py-1.5 text-sm text-text-primary file:mr-3 file:min-h-[44px] file:rounded-md file:border-0 file:bg-brand-subtle file:px-3 file:font-semibold file:text-brand-primary" />
        </label>
        {fileName && <p className="break-all text-sm text-text-muted">Selected: <span className="font-medium text-text-primary">{fileName}</span> · {headers.length} columns</p>}
        {headers.length > 0 && (
          <form onSubmit={requestPreview} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {fields.map(({ key, label }) => (
                <label key={key} className="text-sm font-medium text-text-primary">
                  {label}
                  <select value={mapping[key] ?? ''} onChange={(event) => setFieldMapping(key, event.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-border-strong bg-canvas px-3 text-sm text-text-primary">
                    <option value="">Do not map</option>
                    {headers.map((header) => <option key={header} value={header} disabled={Object.entries(mapping).some(([otherKey, selected]) => otherKey !== key && selected === header)}>{header}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <p className="text-xs text-text-muted">Map an email or phone column to check existing accounts. A mapped source column must contain an active source name or ID; blank or “None” clears attribution. CSV values are used for this preview and confirmation only.</p>
            <button type="submit" disabled={isPending || !csvText || mappedHeaderCount === 0} className="min-h-[44px] rounded-lg bg-brand-primary px-4 text-sm font-semibold text-brand-subtle disabled:opacity-60">{isPending ? 'Checking rows…' : 'Preview import'}</button>
          </form>
        )}

        {preview && !confirmed && (
          <form onSubmit={confirm} className="space-y-4 border-t border-border-subtle pt-5">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-primary" aria-live="polite">
              <span>{preview.counts.ready} new</span><span>{preview.counts.matched} matched</span><span>{preview.counts.conflicts} conflicts</span><span>{preview.counts.errors} invalid</span>
            </div>
            <div className="space-y-3 lg:hidden">
              {preview.rows.map((row) => (
                <article key={row.rowNumber} className="min-w-0 space-y-3 rounded-xl border border-border-subtle bg-canvas p-3">
                  <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">CSV row {row.rowNumber}</h3><span className="rounded-md bg-canvas-subtle px-2 py-1 text-xs font-medium text-text-muted">{row.status.toLowerCase()}</span></div>
                  <StudentRowDetails row={row} />
                  <RowActionSelect row={row} value={actions[row.rowNumber] ?? 'SKIP'} onChange={(value) => setActions((current) => ({ ...current, [row.rowNumber]: value }))} />
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-lg border border-border-subtle lg:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-b border-border-subtle bg-canvas-subtle text-xs uppercase text-text-muted">
                  <tr><th className="px-3 py-3">Row</th><th className="px-3 py-3">Student details</th><th className="px-3 py-3">Match / validation</th><th className="px-3 py-3">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber} className="align-top">
                      <td className="break-all px-3 py-3 tabular-nums text-text-primary">{row.rowNumber}</td>
                      <td className="break-words px-3 py-3"><StudentRowDetails row={row} /></td>
                      <td className="break-words px-3 py-3 text-xs text-text-muted">{row.status === 'READY' ? `New pending-credentials Student · Source: ${row.referralSourceName || 'None'}` : row.status === 'MATCHED' ? `Matched · ${row.changes.length} mapped change${row.changes.length === 1 ? '' : 's'}` : reasonLabel(row.reasonCode)}</td>
                      <td className="px-3 py-3"><RowActionSelect row={row} value={actions[row.rowNumber] ?? 'SKIP'} onChange={(value) => setActions((current) => ({ ...current, [row.rowNumber]: value }))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <label className="flex min-h-[44px] items-start gap-3 text-sm text-text-primary">
              <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} className="mt-1 h-4 w-4 accent-brand-primary" />
              <span>I reviewed the mapped fields, matches, and row actions. Confirm creates pending accounts without passwords and records import outcomes.</span>
            </label>
            <button type="submit" disabled={isPending || !reviewed} className="min-h-[44px] rounded-lg bg-brand-primary px-4 text-sm font-semibold text-brand-subtle disabled:opacity-60">{isPending ? 'Recording import…' : 'Confirm import'}</button>
          </form>
        )}
        {message && <p role="status" className="rounded-lg bg-brand-subtle px-3 py-2 text-sm text-brand-primary">{message}</p>}
        {error && <p role="alert" className="rounded-lg bg-brand-subtle px-3 py-2 text-sm text-brand-primary">{error}</p>}
      </div>
    </section>
  );
}
