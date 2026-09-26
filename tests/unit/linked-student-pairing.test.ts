import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { canonicalStudentPair, createLinkedRelationshipTx } from '@/features/accounts/server/linked-students';
import { expandLinkedGroupParticipantsTx } from '@/features/sessions/server/linked-group-pairing';

const pair = { student_a_id: 'student-a', student_b_id: 'student-b' };

function txMock(overrides: Record<string, unknown> = {}) {
  return {
    linkedStudentRelationship: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'relationship-1', ...pair }),
    },
    sessionSeriesParticipant: { findMany: vi.fn().mockResolvedValue([]) },
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'student-a', role: 'STUDENT', account_status: 'ACTIVE' }) },
    ...overrides,
  } as unknown as Prisma.TransactionClient;
}

describe('linked Student relationship', () => {
  it('stores a canonical pair regardless of input order and rejects self-linking', () => {
    expect(canonicalStudentPair('student-b', 'student-a')).toEqual(pair);
    expect(() => canonicalStudentPair('student-a', 'student-a')).toThrow('cannot be linked to themselves');
  });

  it('creates one relationship after checking both Student accounts and active membership', async () => {
    const tx = txMock();
    await createLinkedRelationshipTx(tx, 'student-b', 'student-a', 'admin-1');
    expect(tx.linkedStudentRelationship.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { ...pair, discount_amount: 100, created_by_admin_id: 'admin-1' },
    }));
    expect(tx.linkedStudentRelationship.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ active: true }) }));
  });

  it('rejects non-Student and already-paired accounts', async () => {
    const nonStudent = txMock({ user: { findUnique: vi.fn().mockResolvedValue({ id: 'student-a', role: 'TUTOR' }) } });
    await expect(createLinkedRelationshipTx(nonStudent, 'student-a', 'student-b', 'admin-1')).rejects.toThrow('must still exist as Students');
    const occupied = txMock({ linkedStudentRelationship: { findFirst: vi.fn().mockResolvedValue({ id: 'existing' }), create: vi.fn() } });
    await expect(createLinkedRelationshipTx(occupied, 'student-a', 'student-b', 'admin-1')).rejects.toThrow('already in an active linked pair');
  });
});

describe('linked Group roster expansion', () => {
  function pairingTx(options: { current?: string[]; linkedAssignments?: Array<{ series_id: string }>; partnerAssignments?: Array<{ series: { session_type: 'GROUP' | 'PRIVATE' } }> } = {}) {
    const sessionSeriesParticipant = {
      findMany: vi.fn(async (args: { where: { series_id?: string; student_id?: string | { in: string[] } } }) => {
        if (typeof args.where.series_id === 'string' && options.current) return options.current.map((student_id) => ({ student_id }));
        if (typeof args.where.student_id === 'object') return options.linkedAssignments ?? [];
        return options.partnerAssignments ?? [];
      }),
    };
    return txMock({
      linkedStudentRelationship: { findMany: vi.fn().mockResolvedValue([pair]) },
      sessionSeriesParticipant,
    });
  }

  it('auto-pairs either Student once and leaves PRIVATE rosters unchanged', async () => {
    const tx = pairingTx();
    await expect(expandLinkedGroupParticipantsTx(tx, ['student-a'], 'GROUP')).resolves.toEqual(['student-a', 'student-b']);
    await expect(expandLinkedGroupParticipantsTx(tx, ['student-b'], 'GROUP')).resolves.toEqual(['student-b', 'student-a']);
    await expect(expandLinkedGroupParticipantsTx(tx, ['student-a'], 'PRIVATE')).resolves.toEqual(['student-a']);
  });

  it('does not drag a PRIVATE partner into a Group and blocks another Group assignment', async () => {
    const privatePartner = pairingTx({ partnerAssignments: [{ series: { session_type: 'PRIVATE' } }] });
    await expect(expandLinkedGroupParticipantsTx(privatePartner, ['student-a'], 'GROUP')).resolves.toEqual(['student-a']);
    const otherGroup = pairingTx({ linkedAssignments: [{ series_id: 'other-series' }] });
    await expect(expandLinkedGroupParticipantsTx(otherGroup, ['student-a'], 'GROUP')).rejects.toThrow('already assigned to another Group');
  });

  it('is idempotent when both are present and fails a two-seat pair atomically at one remaining seat', async () => {
    const together = pairingTx({ current: ['student-a', 'student-b'] });
    await expect(expandLinkedGroupParticipantsTx(together, ['student-a', 'student-b'], 'GROUP', 'series-1')).resolves.toEqual(['student-a', 'student-b']);
    const nearlyFull = pairingTx({ current: ['other-1', 'other-2', 'other-3'] });
    await expect(expandLinkedGroupParticipantsTx(nearlyFull, ['student-a', 'other-1', 'other-2', 'other-3'], 'GROUP', 'series-1'))
      .rejects.toThrow('2 linked seats required; 1 seat available');
  });
});
