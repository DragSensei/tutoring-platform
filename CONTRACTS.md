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
