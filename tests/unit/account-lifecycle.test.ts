import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAuth } from '@/shared/server/session';
import { getAccountDeletionImpact, permanentlyDeleteAccount, setAccountActive } from '@/features/accounts/server/account-actions';

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn(), transaction: vi.fn(), impactUserFind: vi.fn(), walletCount: vi.fn() }));
vi.mock('@/shared/server/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/shared/lib/prisma', () => ({ prisma: { $transaction: mocks.transaction, user: { findUnique: mocks.impactUserFind }, wallet: { count: mocks.walletCount } } }));

describe('Admin account lifecycle guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ userId: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN' });
  });

  it('fails closed on tutor deactivation while future assignment remains', async () => {
    const tx = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'tutor-1', role: 'TUTOR', account_status: 'ACTIVE' }), update: vi.fn() },
      session: { count: vi.fn().mockResolvedValue(2) },
      sessionSeries: { count: vi.fn().mockResolvedValue(1) },
    };
    mocks.transaction.mockImplementation((work: (arg: typeof tx) => unknown) => work(tx));
    await expect(setAccountActive('tutor-1', false)).rejects.toThrow('2 future sessions and 1 active recurring schedules');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('removes only safe future Student participation before deactivation', async () => {
    const tx = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'student-1', role: 'STUDENT', account_status: 'ACTIVE' }), update: vi.fn() },
      session: { findMany: vi.fn().mockResolvedValue([]) },
      sessionSeries: { findMany: vi.fn().mockResolvedValue([]) },
      sessionParticipant: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
      sessionSeriesParticipant: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    mocks.transaction.mockImplementation((work: (arg: typeof tx) => unknown) => work(tx));
    await expect(setAccountActive('student-1', false)).resolves.toEqual({ status: 'DEACTIVATED', removedFutureParticipation: 3 });
    expect(tx.sessionParticipant.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ student_id: 'student-1' }) }));
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'student-1' }, data: { account_status: 'DEACTIVATED' } });
  });

  it('blocks Student deactivation when a future group would violate the minimum roster', async () => {
    const tx = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'student-1', role: 'STUDENT', account_status: 'ACTIVE' }), update: vi.fn() },
      session: { findMany: vi.fn().mockResolvedValue([{ id: 'group-1', session_type: 'GROUP', _count: { participants: 1 } }]) },
      sessionSeries: { findMany: vi.fn().mockResolvedValue([]) },
      sessionParticipant: { deleteMany: vi.fn() },
      sessionSeriesParticipant: { deleteMany: vi.fn() },
    };
    mocks.transaction.mockImplementation((work: (arg: typeof tx) => unknown) => work(tx));
    await expect(setAccountActive('student-1', false)).rejects.toThrow('without the minimum one Student');
    expect(tx.sessionParticipant.deleteMany).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('blocks removal of the sole Student from a future private session', async () => {
    const tx = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'student-1', role: 'STUDENT', account_status: 'ACTIVE' }), update: vi.fn() },
      session: { findMany: vi.fn().mockResolvedValue([{ id: 'private-1', session_type: 'PRIVATE', status: 'SCHEDULED', attendance_saved_at: null, attendance_finalized_at: null, _count: { participants: 1, attendances: 0, transactions: 0, commission_entries: 0 }, tutor_compensation: null }]) },
      sessionSeries: { findMany: vi.fn().mockResolvedValue([]) },
      sessionParticipant: { deleteMany: vi.fn() },
      sessionSeriesParticipant: { deleteMany: vi.fn() },
    };
    mocks.transaction.mockImplementation((work: (arg: typeof tx) => unknown) => work(tx));
    await expect(setAccountActive('student-1', false)).rejects.toThrow('without the minimum one Student');
    expect(tx.sessionParticipant.deleteMany).not.toHaveBeenCalled();
  });

  it('blocks future participant removal after attendance was saved even when no Students were present', async () => {
    const tx = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'student-1', role: 'STUDENT', account_status: 'ACTIVE' }), update: vi.fn() },
      session: { findMany: vi.fn().mockResolvedValue([{ id: 'session-1', session_type: 'GROUP', status: 'SCHEDULED', attendance_saved_at: new Date(), attendance_finalized_at: null, _count: { participants: 2, attendances: 0, transactions: 0, commission_entries: 0 }, tutor_compensation: null }]) },
      sessionSeries: { findMany: vi.fn().mockResolvedValue([]) },
      sessionParticipant: { deleteMany: vi.fn() },
      sessionSeriesParticipant: { deleteMany: vi.fn() },
    };
    mocks.transaction.mockImplementation((work: (arg: typeof tx) => unknown) => work(tx));
    await expect(setAccountActive('student-1', false)).rejects.toThrow('saved attendance or financial history');
    expect(tx.sessionParticipant.deleteMany).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('requires the exact destructive phrase before any permanent deletion transaction', async () => {
    await expect(permanentlyDeleteAccount('student-1', 'delete this account')).rejects.toThrow('exact confirmation phrase');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('reports concrete dependencies and blocks permanent deletion when history exists', async () => {
    const userWithHistory = { id: 'tutor-1', role: 'TUTOR', account_status: 'DEACTIVATED', referral_source_id: null, referral_source: null, _count: { tutored_sessions: 3, tutored_series: 1, attendances: 0, session_participants: 0, series_participants: 0, setup_tokens: 0, created_transactions: 0, created_student_imports: 0, imported_student_rows: 0, tutor_compensation_entries: 2, commission_entries: 0, commission_policy_updates: 0, tutor_payouts: 1, created_payouts: 0 } };
    const tx = { user: { findUnique: vi.fn().mockResolvedValue(userWithHistory), delete: vi.fn() }, wallet: { count: vi.fn().mockResolvedValue(0) } };
    mocks.transaction.mockImplementation((work: (arg: typeof tx) => unknown) => work(tx));
    await expect(getAccountDeletionImpact('tutor-1')).resolves.toMatchObject({ canDelete: false, dependencies: expect.arrayContaining([{ category: 'tutored_sessions', count: 3 }, { category: 'tutor_compensation_entries', count: 2 }, { category: 'tutor_payouts', count: 1 }]) });
    await expect(permanentlyDeleteAccount('tutor-1', 'delete-this-account')).rejects.toThrow('related history');
    expect(tx.user.delete).not.toHaveBeenCalled();
  });
});
