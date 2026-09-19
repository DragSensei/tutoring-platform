import { notFound } from 'next/navigation';
import { getAccountDetail } from '../_components/accounts-data';
import { AccountDetailView } from './_components/account-detail-view';

export const dynamic = 'force-dynamic';

export default async function AdminAccountDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const account = await getAccountDetail(params.id);

  if (!account) notFound();

  return <AccountDetailView account={account} />;
}
