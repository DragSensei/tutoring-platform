import { notFound } from 'next/navigation';
import { getAdminPayableDetail } from '@/features/finances/server/finance-actions';
import { PayableDetail } from './_components/payable-detail';

export const dynamic = 'force-dynamic';

export default async function AdminPayablePage({ params }: { params: { recipientType: string; recipientId: string } }) {
  const detail = await getAdminPayableDetail(params.recipientType, params.recipientId);
  if (!detail) notFound();
  return <PayableDetail detail={detail} />;
}
