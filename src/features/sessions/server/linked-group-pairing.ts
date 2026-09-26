import { Prisma } from '@prisma/client';

export async function expandLinkedGroupParticipantsTx(
  tx: Prisma.TransactionClient,
  participantIds: string[],
  sessionType: 'PRIVATE' | 'GROUP',
  targetSeriesId?: string,
) {
  const requested = [...new Set(participantIds)];
  if (sessionType === 'PRIVATE') return requested;

  const currentRoster = targetSeriesId
    ? await tx.sessionSeriesParticipant.findMany({ where: { series_id: targetSeriesId }, select: { student_id: true } })
    : [];
  const currentIds = new Set(currentRoster.map(({ student_id }) => student_id));
  const relationships = await tx.linkedStudentRelationship.findMany({
    where: { active: true, OR: [{ student_a_id: { in: requested } }, { student_b_id: { in: requested } }] },
    select: { student_a_id: true, student_b_id: true },
  });
  const expanded = new Set(requested);
  for (const relationship of relationships) {
    const hasA = expanded.has(relationship.student_a_id);
    const hasB = expanded.has(relationship.student_b_id);
    const linkedAssignments = await tx.sessionSeriesParticipant.findMany({
      where: {
        student_id: { in: [relationship.student_a_id, relationship.student_b_id] },
        series: { status: 'ACTIVE', session_type: 'GROUP' },
        ...(targetSeriesId ? { series_id: { not: targetSeriesId } } : {}),
      },
      select: { series_id: true },
    });
    if (linkedAssignments.length) {
      throw new Error('A linked Student is already assigned to another Group. Resolve that assignment before pairing them here.');
    }
    if (hasA === hasB) continue;
    const partnerId = hasA ? relationship.student_b_id : relationship.student_a_id;
    const assignments = await tx.sessionSeriesParticipant.findMany({
      where: { student_id: partnerId, series: { status: 'ACTIVE' }, ...(targetSeriesId ? { series_id: { not: targetSeriesId } } : {}) },
      select: { series_id: true, series: { select: { id: true, session_type: true } } },
    });
    if (assignments.some(({ series }) => series.session_type === 'PRIVATE')) continue;
    expanded.add(partnerId);
  }

  const result = [...expanded];
  if (result.length > 4) {
    const addedSeats = result.filter((id) => !currentIds.has(id)).length;
    const availableSeats = Math.max(0, 4 - currentRoster.length);
    throw new Error(`Linked students cannot both fit in this Group. ${addedSeats} linked seats required; ${availableSeats} seat${availableSeats === 1 ? '' : 's'} available.`);
  }
  return result;
}
