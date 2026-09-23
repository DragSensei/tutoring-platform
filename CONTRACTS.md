# CONTRACTS.md — Tutoring Platform Domain Specifications

## 1. Core Domain Interfaces & Entities

```typescript
// Roles
export type Role = 'ADMIN' | 'TUTOR' | 'STUDENT';

// Session Types & platform-fallback prices (EGP)
export type SessionType = 'PRIVATE' | 'GROUP';

// These values are the PlatformPolicy fallback when a series has no profile.
export const SESSION_PRICING: Record<SessionType, number> = {
  PRIVATE: 500.00,
  GROUP: 375.00,
};

// Session Statuses
export type SessionStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

// Ledger Transaction Types
export type TransactionType = 'ADMIN_DEPOSIT' | 'SESSION_DEDUCTION' | 'REFUND';
export type ReferralSourceKind = 'DIRECT' | 'REFERRAL' | 'SALES';
export type CommissionBasis = 'FINALIZED_SESSION_WALLET_CHARGE';
export type StudentImportRowOutcome = 'CREATED' | 'UPDATED' | 'MATCHED' | 'SKIPPED' | 'CONFLICT' | 'INVALID';
export type Money = string; // Decimal serialized as a base-10 string at API boundaries.

export interface ReferralSourceContract {
  id: string;
  name: string;
  kind: ReferralSourceKind;
  isActive: boolean;
}

export interface PricingProfileContract {
  id: string;
  name: string;
  privateSessionPrice: Money;
  groupSessionPrice: Money;
  isActive: boolean;
}

// User Schema (Prisma)
export interface UserContract {
  id: string;
  name: string | null;
  phone: string | null; // Unique when present
  email: string | null; // Unique when present
  role: Role;
  referralSourceId?: string | null; // Student attribution only; null is the explicit None option.
  tutorHourlyRateOverride?: Money | null; // Tutor only; null uses PlatformPolicy default.
  createdAt: Date;
  updatedAt: Date;
}

// Wallet Schema (1:1 with User)
export interface WalletContract {
  id: string;
  userId: string;
  balance: Money; // NUMERIC(10, 2)
  isFlaggedOverdraft: boolean; // Overdraft policy: true when balance < 0
  createdAt: Date;
  updatedAt: Date;
}

// Session Schema
export interface SessionContract {
  id: string;
  tutorId: string;
  title: string;
  sessionType: SessionType;
  startTime: Date;
  endTime: Date;
  deadline: Date; // Attendance closes at endTime + configured grace.
  token?: string | null; // Historical compatibility field; no public attendance flow.
  status: SessionStatus;
  historicalOnly: boolean; // Historical backfill rows never create finance.
  pricingProfileId?: string | null;
  pricingProfileNameSnapshot?: string | null;
  studentPriceSnapshot?: Money | null; // Set once at durable financial settlement.
  attendanceNotes?: string | null; // Required when Tutor records attendance
  createdAt: Date;
  updatedAt: Date;
}

// Durable session roster membership
export interface SessionParticipantContract {
  sessionId: string;
  studentId: string;
  // Unique Constraint: @@id([sessionId, studentId])
}

// Attendance Record (final Tutor attendance truth / Student check-in proof)
export interface AttendanceRecordContract {
  id: string;
  sessionId: string;
  studentId: string;
  attendedAt: Date;
  // Unique Constraint: @@unique([sessionId, studentId])
}

// Immutable Ledger Transaction Record
export interface WalletTransactionContract {
  id: string;
  walletId: string;
  amount: Money; // +/- NUMERIC(10, 2)
  transactionType: TransactionType;
  sessionId?: string | null;
  createdByUserId?: string | null;
  createdAt: Date;
}

// Provenance: attendance reconciliation entries leave createdByUserId null;
// Admin-created deposits/refunds carry the authenticated Admin user ID and
// are never included in Tutor attendance net-charge reconciliation.

export interface TutorCompensationLedgerEntryContract {
  sessionId: string; // Unique: at most one accrual per delivered Session.
  tutorId: string;
  deliveredMinutes: number;
  hourlyRate: Money; // Snapshot: Tutor override or PlatformPolicy default.
  amount: Money;
  createdAt: Date;
}

export interface CommissionLedgerEntryContract {
  sessionId: string;
  studentId: string;
  sourceWalletTransactionId: string; // A real negative SESSION_DEDUCTION event.
  recipientSourceId: string; // The Student's eligible ReferralSource, never an auth role.
  recipientSourceNameSnapshot: string;
  basis: CommissionBasis;
  basisAmount: Money;
  rateBps: number;
  amount: Money;
  ruleVersion: number;
  createdAt: Date;
}
```

---

## 2. Algorithmic Bounds & Complexity (Big-O)

| Operation | Time Complexity | Space Complexity | Notes |
| :--- | :--- | :--- | :--- |
| **Token Verification & 4-Hour Deadline Check** | $O(1)$ | $O(1)$ | Direct B-Tree lookup on `Session(token)` unique index. |
| **Duplicate Attendance Check** | $O(1)$ | $O(1)$ | B-Tree lookup on composite unique index `AttendanceRecord(session_id, student_id)`. |
| **Atomic Wallet Deduction & Transaction Insert** | $O(1)$ | $O(1)$ | Single indexed update on `Wallet(id)` and append-only write to `WalletTransaction`. |
| **Tutor Monthly & Lifetime KPI Aggregation** | $O(\log N + K)$ | $O(1)$ | Indexed count queries on `Session(tutor_id, start_time)` and `AttendanceRecord(session_id)`. |
| **Tutor Attendance Replacement** | $O(R)$ | $O(R)$ | Transactionally validates and replaces presence for the durable `SessionParticipant` roster; `R <= 4` under the current session capacity contract. |
| **Admin Overdraft Review Query** | $O(M)$ | $O(M)$ | Filtered query on `Wallet(is_flagged_overdraft = true)`. |

---

## 3. Unidirectional Data Flows

### Tutor Attendance, Wallet Settlement, and Finance Accrual Flow:
```
Authenticated Tutor server-action request { sessionId, presentStudentIds, notes }
  │
  ├── 1. Require Tutor identity and scope Session to authenticated tutor_id
  │
  ├── 2. Read the durable SessionParticipant roster; reject IDs outside the roster
  │
  ├── 3. Save final Tutor attendance; editing closes at end_time + policy grace
  │
  └── 4. At due finalization, one serializable transaction:
         ├── Re-read and lock current Session, policy, profile, Tutor, and roster
         ├── Skip finance when Session.historical_only = true
         ├── Reconcile each Student's final net charge in WalletTransaction
         ├── Snapshot the resolved per-student price/profile on Session once
         ├── Create one Tutor compensation entry only with explicit saved attendance
         └── Create commission only for eligible REFERRAL/SALES sources and a real negative charge row
  │
  └── 5. Repeated/concurrent finalization creates no duplicate wallet, tutor-pay, or commission entries
```

### Tutor Attendance Persistence Flow:
```
Client server-action request { sessionId, presentStudentIds, notes }
  │
  ├── 1. Require an authenticated Tutor session
  │
  └── 2. Atomic database transaction (prisma.$transaction, serializable):
         ├── Read the session by id + authenticated tutor_id
         ├── Read the durable SessionParticipant roster (fail closed when empty)
         ├── Reject any submitted student outside that roster before mutation
         ├── Persist final AttendanceRecord presence state
         ├── Reconcile every participant's net session charge through the shared billing owner
         └── Persist notes and Session.status = COMPLETED
  │
  └── 3. Revalidate Tutor Agenda, History, and attendance route
```

- An empty `presentStudentIds` array is valid after explicit review; completion and notes on `Session` distinguish it from an untouched session.
- `Session.status = COMPLETED` means the session occurrence and attendance have been finalized. It does not assert durable screenshot evidence.
- PRESENT has exactly one net session charge; ABSENT has zero net session charge. Reconciliation appends immutable deductions/refunds and never deletes ledger history.
- Repeating the same payload is idempotent because attendance is replaced against the unique `(session_id, student_id)` key and financial reconciliation targets the existing net ledger state.
- Screenshot evidence is intentionally excluded from the server contract and remains browser-local until an approved durable storage provider exists.

---

## 4. Failure Modes & Mitigations

Feature authorization imports the canonical `requireAuth` owner from
`src/shared/server/session.ts`. The auth feature keeps a compatibility facade
for app callers and owns password authentication; domain features do not import
other feature implementations for authorization.

1. **Race Condition on Attendance Finalization or Accrual:**
   - *Risk:* A Tutor saves the same final state concurrently or two finalizers settle the same Session.
   - *Mitigation:* Database composite unique indexes plus serializable Prisma transactions. Any conflicting request rolls back all attendance, wallet, and ledger mutations.

2. **Negative Balance / Overdraft Exploitation:**
   - *Risk:* A student with 0.00 EGP attends multiple high-value private sessions (500.00 EGP each).
   - *Mitigation:* System intentionally allows negative balance per business rules (credit/post-paid sessions) while atomically setting `is_flagged_overdraft = true`. Flagged accounts appear immediately on the Admin Wallets review dashboard.

3. **Late Attendance Mutation:**
   - *Risk:* A client submits a Tutor attendance edit after the allowed window.
   - *Mitigation:* The server checks the Session end time plus configured grace; client time is never authoritative.

4. **Tutor IDOR / Roster Injection:**
   - *Risk:* A Tutor submits another Tutor's session ID or adds arbitrary student IDs.
   - *Mitigation:* The write transaction scopes the session lookup to the authenticated `tutor_id` and verifies every submitted ID against the durable `SessionParticipant` roster before mutating attendance or finances. Sessions without participants fail closed.

---

## 5. REST API Endpoints & Request/Response Contracts

### `GET /api/sessions`
Retrieves scheduled tutoring sessions for agenda and calendar dashboards.
- **Status:** `200 OK`
```json
{
  "sessions": [
    {
      "id": "s-1",
      "title": "Electronics Level 1: Arduino Fundamentals",
      "sessionType": "GROUP",
      "startTime": "2026-09-20T14:00:00.000Z",
      "endTime": "2026-09-20T16:00:00.000Z",
      "deadline": "2026-09-20T18:00:00.000Z",
      "token": "token-arduino-101",
      "status": "SCHEDULED",
      "attendeeCount": 6,
      "price": 375
    },
    {
      "id": "s-2",
      "title": "Robotics Studio: Sumo Bot Challenge",
      "sessionType": "PRIVATE",
      "startTime": "2026-09-21T10:00:00.000Z",
      "endTime": "2026-09-21T12:00:00.000Z",
      "deadline": "2026-09-21T14:00:00.000Z",
      "token": "token-sumo-202",
      "status": "SCHEDULED",
      "attendeeCount": 1,
      "price": 500
    }
  ]
}
```

### `saveTutorAttendance` server action
Persists the authenticated Tutor's complete attendance decision and required session notes.
```json
{
  "success": true,
  "sessionId": "s-1",
  "presentCount": 0
}
```

## 6. Weekly Recurrence Contracts

```typescript
export type SeriesStatus = 'ACTIVE' | 'ENDED' | 'CANCELLED';

export interface SessionSeriesContract {
  id: string;
  tutorId: string;
  title: string;
  sessionType: SessionType;
  weekday: number; // 0 = Sunday ... 6 = Saturday, academy calendar
  startMinute: number; // 0..1439, Africa/Cairo wall-clock time
  durationMinutes: number; // 30..480
  pricingProfileId: string | null; // null explicitly selects PlatformPolicy fallback pricing.
  startsOn: Date; // academy-calendar date, normalized to UTC midnight
  endsOn?: Date | null;
  status: SeriesStatus;
  participants: string[]; // normal Student roster
}

export interface SessionOccurrenceContract extends SessionContract {
  seriesId?: string | null;
  occurrenceDate?: Date | null; // unique series/week key, normalized date
  seriesException: boolean;
}
```

- `SessionSeries` is the canonical recurring assignment. `Session` remains the
  concrete occurrence for attendance, check-in, completion, wallet, cancellation,
  and audit history.
- The materializer keeps a bounded 12-week horizon. It uses one shared helper for
  Admin, Tutor, Student, and series creation reads; no dashboard computes dates.
- `@@unique([series_id, occurrence_date])` plus `createMany({ skipDuplicates: true })`
  makes materialization idempotent and safe under concurrent requests.
- Series rosters are copied into each occurrence at materialization. Future-only
  series edits update/delete only occurrences with no attendance or financial
  history; completed/history-bearing occurrences are never rewritten.
- Edit scope is `THIS`, `THIS_AND_FUTURE`, or `ENTIRE_SERIES`. `THIS` sets a
  concrete occurrence exception; future scopes update the series and rematerialize
  safe future occurrences. Cancel scope has the same values; cancellation never
  rewrites completed or financial history.
- `Africa/Cairo` is the current academy wall-clock timezone already used by the
  shared date formatters. Occurrence timestamps are stored as instants; the series
  stores calendar weekday/minute so DST or server timezone does not alter the rule.
- Admin series input serializes `pricingProfileId: string | null`; the form option
  `Platform pricing` maps to null. A selected ID points to an active named profile.
- Materialized Sessions copy the selected profile ID only. They do not freeze an
  unfinalized charge: `student_price_snapshot` and `pricing_profile_name_snapshot`
  remain null until durable financial settlement resolves the current profile or
  PlatformPolicy fallback. The settlement transaction writes the price/name once.
- Profile changes can therefore affect unfinalized Sessions. A completed financial
  snapshot is immutable and is the source for later reporting.
- `historical_only = true` is reserved for explicit pre-system history imports;
  those Sessions remain visible for scheduling/history but produce no wallet,
  Tutor-pay, or commission ledger entries. Existing Sessions default false and
  are not reclassified by migration.

## 7. Account Provisioning & Credential Contracts

```typescript
export type AccountStatus = 'PENDING_CREDENTIALS' | 'PENDING_PROFILE' | 'ACTIVE';

export interface CreateAccountInput {
  role: Extract<Role, 'TUTOR' | 'STUDENT'>;
  name?: string;
  email?: string;
  phone?: string;
  referralSourceId?: string | null; // Student only; null is explicit None, Direct is a seeded source.
}

export interface AccountSetupTokenContract {
  userId: string;
  purpose: 'SETUP' | 'PASSWORD_RESET';
  tokenHash: string; // SHA-256 digest only; raw token is returned once to setup UI
  expiresAt: Date;
  consumedAt?: Date | null;
}
```

- Only an authenticated Admin can provision Tutor or Student accounts. Admin
  accounts are managed outside this provisioning flow.
- `User.name`, `User.email`, `User.phone`, and `User.password_hash` are nullable
  so a partial Student can contain only known information. `account_status` is
  explicit; a password without the required profile remains `PENDING_PROFILE` and
  cannot receive a normal portal session.
- Admin account lists/details never select or return `password_hash`, token hashes,
  raw setup tokens, or existing credentials. `SETUP` tokens are limited to pending
  Tutor/Student onboarding and may complete the required profile. `PASSWORD_RESET`
  tokens are limited to active Tutor/Student accounts and may change only the
  password. Both use a random one-time token whose hash is stored, purpose-scoped
  revocation, short expiry, and atomic consumption.
- Authentication is fail-closed for `PENDING_CREDENTIALS` and
  `PENDING_PROFILE`; only `ACTIVE` accounts with a stored hash and complete profile
  can receive a signed portal session.

### Student CSV Import

- Only an authenticated Admin can confirm a batch. Header parsing, column mapping,
  preview, validation, conflict reporting, and dry-run are non-mutating.
- Confirmation revalidates the mapped canonical fields server-side and creates
  partial Students as `PENDING_CREDENTIALS`; it never accepts a password or raw
  setup token from CSV.
- Email and phone are normalized and matched independently. A row is a conflict
  when they identify different accounts, a non-Student, or an ambiguous identity.
  Updating a matched Student requires an explicit per-row update selection.
- `StudentImportBatch` and `StudentImportRow` persist actor, time, idempotency key,
  row number, outcome, fixed reason code, and matched User link only. They never
  persist CSV bytes, raw row JSON, passwords, or setup secrets. Outcome counts are
  aggregated from row records; dry-runs create no batch or row records.

### `POST /api/admin/wallets/deposit`
Direct administrative wallet credit top-up.
- **Status:** `200 OK`
```json
{
  "success": true,
  "walletId": "w-mock-001",
  "creditedAmount": 1000,
  "newBalance": 2500
}
```

### `POST /api/auth/login`
Authentication login route for Admin, Tutor, and Student accounts. The
`identifier` may be the stored email or phone number; the server resolves the
database User and verifies its stored password hash. Successful sessions route
to `/admin`, `/tutor/agenda`, or `/student/dashboard` from the authenticated
database role. Invalid credentials always return the same generic failure.
- **Status:** `200 OK`
```json
{
  "success": true,
  "user": {
    "userId": "usr-mock-001",
    "name": "Eng. Omar Ashraf",
    "email": "omar.ashraf@bigherorobotics.com",
    "role": "TUTOR"
  }
}
```

### `POST /api/auth/logout`
terminates current session and clears authentication cookie.
- **Status:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

## 4. Platform Policy Contracts & Configuration

```typescript
export interface PlatformPolicyContract {
  id: string; // 'default'
  checkInWindowHours: number; // e.g., 4
  groupSessionPrice: Money; // Platform fallback; a named profile may override at settlement.
  privateSessionPrice: Money;
  allowOverdraft: boolean; // default: true
  defaultTutorHourlyRate: Money; // Default zero until Admin configures an approved rate.
  commissionEnabled: boolean; // default false
  commissionBasis: CommissionBasis;
  commissionRateBps: number;
  commissionRuleVersion: number;
  commissionUpdatedByUserId: string | null;
  updatedAt: Date;
}
```

### Server Actions: `src/features/policies/server/policy-actions.ts`
- `getPlatformPolicies()`: Fetches the singleton, seeding fallback prices, a zero hourly Tutor rate, disabled commission, zero basis points, and the fixed commission basis when absent.
- `getActivePricingProfiles()`: Admin-only read returning serializable `{ id, name, privateSessionPrice, groupSessionPrice }` rows; money is a decimal string.
- `updatePlatformPolicies(data)`: Validates money and basis-point bounds, stores the authenticated Admin as commission-rule updater, increments the rule version when terms change, and revalidates Admin policies, scheduling, and finance routes.
- Named Pricing Profiles store PRIVATE/GROUP prices. A nullable `SessionSeries.pricing_profile_id` selects one; null means PlatformPolicy fallback. Prices are resolved at final settlement, not occurrence materialization.

## 8. Finance Reporting and Ledger Contracts

- Only Admin routes/actions can read or change finance policy/reporting. Tutor and Student identities cannot submit ledger writes or choose another account's IDs.
- Money remains Prisma `Decimal(10,2)` through all domain calculations. API/UI DTOs serialize decimal values as strings; never derive accounting amounts from JS floating-point arithmetic.
- `WalletTransaction` is the Student wallet ledger. `TutorCompensationLedgerEntry` is the Tutor accrual ledger with one row per Session. `CommissionLedgerEntry` is separate and links one unique session/student event to the exact source wallet transaction.
- Tutor pay is accrued only when finalization has an explicit saved Tutor attendance decision and the Session is not historical-only. Delivered minutes, hourly rate (Tutor override or PlatformPolicy default), and resulting amount are immutable ledger snapshots. The default hourly rate is zero until Admin configures a real rate.
- Commission is disabled by default. When enabled, it is a percentage of a finalized negative `SESSION_DEDUCTION` wallet transaction, using `commission_rate_bps`. The source must be the Student's `REFERRAL` or `SALES` ReferralSource. None/null and DIRECT never accrue. The recipient is the named ReferralSource assigned to that Student, snapshotted with the transaction and rule version.
- `FINALIZED_SESSION_WALLET_CHARGE` records an internal Student wallet charge, not proof that external cash was received. The current ledger has no payment-provider capture event. If a future commission agreement requires cash collection, accrual must remain disabled until that event exists.
- `historical_only = true` Sessions never create wallet reconciliation, Tutor compensation, or commission ledger entries. Migrations leave existing Session rows at the default false; only explicit pre-system history backfills set true. No finance ledger rows are backfilled.
- Date filters use finance ledger `created_at` settlement time; report totals are aggregates of ledger rows and snapshots, never recomputed from current policy/rates/prices. Each detail row includes Session, Tutor/Student, settlement timestamp, and source transaction/rule provenance.
- Unique Session and Session/Student keys, serializable transactions, source-event links, and re-reading policy/Session state inside the transaction make repeated or concurrent settlement idempotent. Ledger rows are append-only; correction requires a new balancing event with provenance.
- Finance Session drill-down is `/admin/finances/sessions/[sessionId]`, a read-only Admin route. It loads the Session by ID only after `ADMIN` authorization and exposes the stored price/profile, Tutor pay, wallet charge, commission, roster, and source-event snapshots. It does not link finalized Sessions to the schedule editor.
- `getAdminFinanceSessionDetail(sessionId)` is the server data owner for that route. Missing IDs return not-found; malformed IDs fail before lookup. Monetary DTO values are decimal strings, and linked User/source records use their canonical Admin account routes.

## 9. Student Import Provenance

- Parsing and column mapping occur in memory. Preview, validation, conflict detection, and dry-run have no database writes; only explicit confirmation creates a batch.
- A confirmed batch revalidates on the server. `CREATED` rows create partial Student accounts with `PENDING_CREDENTIALS`; setup credentials are issued only through the existing one-time hashed-token flow. Existing matches are `MATCHED`, `UPDATED`, or `SKIPPED` according to the explicit per-row choice. Conflicts across email/phone identities fail closed.
- Batch idempotency key, Admin actor, confirmed time, row number, fixed outcome/reason code, and matched User ID are durable provenance. Outcome aggregates provide created, updated, matched, skipped, conflict, and invalid/error counts.
- No CSV bytes, arbitrary row JSON, passwords, raw setup tokens, or secrets are stored or logged.

## 5. Client Table Pagination Contract

```typescript
export const TABLE_PAGE_SIZE = 12;

export interface TablePaginationResult<T> {
  page: number; // one-indexed, clamped to 1..pageCount
  pageCount: number; // at least 1, including an empty table
  pageItems: T[]; // at most TABLE_PAGE_SIZE items
}
```

- Pagination is local view state over data already authorized and loaded by the existing route.
- No API, database, auth, or persistence contract changes.
- `page` is clamped when data changes; controls are omitted when `pageCount` is one.
- Bounds: deriving a page is O(12) time and O(12) output space; page-count calculation is O(1).
