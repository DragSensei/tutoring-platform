import { notFound } from 'next/navigation';
import { getAdminFinanceSessionDetail } from '@/features/finances/server/finance-actions';
import { FinanceSessionDetail } from './_components/finance-session-detail';

export const dynamic = 'force-dynamic';

export default async function AdminFinanceSessionPage({ params }: { params: { sessionId: string } }) {
  const detail = await getAdminFinanceSessionDetail(params.sessionId);
  if (!detail) notFound();
  return <FinanceSessionDetail detail={detail} />;
}
