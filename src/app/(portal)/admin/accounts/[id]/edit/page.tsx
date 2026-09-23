import { notFound } from 'next/navigation';
import { getReferralSources } from '@/features/accounts/server/account-actions';
import { getAccountDetail } from '../../_components/accounts-data';
import { AccountEditForm } from './_components/account-edit-form';

export const dynamic = 'force-dynamic';

export default async function AdminAccountEditPage({ params }: { params: { id: string } }) {
  const [account, referralSources] = await Promise.all([getAccountDetail(params.id), getReferralSources()]);
  if (!account || account.role === 'ADMIN') notFound();
  return <AccountEditForm account={account} referralSources={referralSources} />;
}
