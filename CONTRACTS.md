# CONTRACTS.md — Tutoring Platform Domain Specifications

## 1. Core Domain Interfaces & Entities

```typescript
// Roles
export type Role = 'ADMIN' | 'TUTOR' | 'STUDENT';

// Session Types & Fixed Pricing Matrix (EGP)
export type SessionType = 'PRIVATE' | 'GROUP';

export const SESSION_PRICING: Record<SessionType, number> = {
  PRIVATE: 500.00,
  GROUP: 375.00,
};

// Session Statuses
export type SessionStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

// Ledger Transaction Types
export type TransactionType = 'ADMIN_DEPOSIT' | 'SESSION_DEDUCTION' | 'REFUND';

// User Schema (Prisma)
export interface UserContract {
  id: string;
  name: string;
  phone: string; // Unique
  email: string; // Unique
  passwordHash: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

// Wallet Schema (1:1 with User)
export interface WalletContract {
  id: string;
  userId: string;
  balance: number; // NUMERIC(10, 2)
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
  deadline: Date; // Computed: startTime + 4 hours
  token: string; // UUID, Unique
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Attendance Record (Proof of presence)
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
  amount: number; // +/- NUMERIC(10, 2)
  transactionType: TransactionType;
  sessionId?: string | null;
  createdByUserId?: string | null;
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
| **Admin Overdraft Review Query** | $O(M)$ | $O(M)$ | Filtered query on `Wallet(is_flagged_overdraft = true)`. |

---

## 3. Unidirectional Data Flows

### Student Check-In & Wallet Deduction Flow:
```
Client Request (GET /attend/[token] or POST /api/attend/[token])
  │
  ├── 1. Auth Guard (Extract Session / Student ID)
  │
  ├── 2. Deadline Verification: NOW() <= session.deadline (start_time + 4h)
  │      └── If NOW() > deadline: ABORT with HTTP 403 Forbidden.
  │
  └── 3. Isolated Database Transaction (prisma.$transaction):
         ├── Check: Has student already checked in? (Throw 409 if duplicate)
         ├── Mutate: INSERT into AttendanceRecords(session_id, student_id, attended_at)
         ├── Mutate: UPDATE Wallet SET balance = balance - session_cost, is_flagged_overdraft = (balance < 0)
         └── Mutate: INSERT into WalletTransactions(wallet_id, amount = -cost, type = 'SESSION_DEDUCTION', session_id)
  │
  └── 4. Success Response: HTTP 200 { success: true, deductedAmount, newBalance, isOverdraft }
```

---

## 4. Failure Modes & Mitigations

1. **Race Condition on Check-In:**
   - *Risk:* A student attempts multiple simultaneous requests to evade balance deductions or duplicate roster entries.
   - *Mitigation:* Database composite unique index `@@unique([session_id, student_id])` enforced inside `prisma.$transaction()`. Any duplicate request errors with code `P2002` and rolls back all modifications.

2. **Negative Balance / Overdraft Exploitation:**
   - *Risk:* A student with 0.00 EGP attends multiple high-value private sessions (500.00 EGP each).
   - *Mitigation:* System intentionally allows negative balance per business rules (credit/post-paid sessions) while atomically setting `is_flagged_overdraft = true`. Flagged accounts appear immediately on the Admin Wallets review dashboard.

3. **Clock Skew & Expired Token Submissions:**
   - *Risk:* Check-in attempt submitted after 4-hour window due to client-side clock tampering.
   - *Mitigation:* The 4-hour expiration check (`NOW() > session.deadline`) evaluates using the database server / server-side timestamp, strictly returning HTTP 403.

---

## 5. REST API Endpoints & Request/Response Contracts

### `POST /api/attend/[token]`
Records student session check-in using unique session token, updates student wallet balance, and creates an audit ledger transaction.
- **Status:** `200 OK`
```json
{
  "success": true,
  "deductedAmount": 375,
  "newBalance": 1125,
  "isOverdraft": false
}
```

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

### `POST /api/attendance/checkin`
Direct tutor attendance checkin action for tutor attendance drawer.
- **Status:** `200 OK`
```json
{
  "success": true,
  "attendanceId": "att-mock-001",
  "sessionId": "s-1",
  "status": "PRESENT",
  "recordedAt": "2026-09-20T14:05:00.000Z"
}
```

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
Authentication login route for tutors and students.
- **Status:** `200 OK`
```json
{
  "success": true,
  "user": {
    "id": "usr-mock-001",
    "name": "Eng. Omar Ashraf",
    "role": "TUTOR",
    "phone": "+201000000001"
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
  groupSessionPrice: number; // e.g., 375.00
  privateSessionPrice: number; // e.g., 500.00
  allowOverdraft: boolean; // default: true
  updatedAt: Date;
}
```

### Server Actions: `src/features/policies/server/policy-actions.ts`
- `getPlatformPolicies()`: Fetches active system policy singleton, seeding defaults (`check_in_window_hours: 4`, `group_session_price: 375`, `private_session_price: 500`, `allow_overdraft: true`) if non-existent.
- `updatePlatformPolicies(data)`: Validates input with `updatePolicySchema` (`zod`), persists to DB, and executes `revalidatePath` across `/admin/policies`, `/admin/gadwal`, and `/tutor/agenda`.


