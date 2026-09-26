import { notFound } from 'next/navigation';
import { getReferralSources } from '@/features/accounts/server/account-actions';
import { getAccountDetail } from '../../_components/accounts-data';
import { getLinkedStudentCandidates } from '@/features/accounts/server/linked-students';
import { AccountEditForm } from './_components/account-edit-form';

export const dynamic = 'force-dynamic';

export default async function AdminAccountEditPage({ params }: { params: { id: string } }) {
  const [account, referralSources] = await Promise.all([getAccountDetail(params.id), getReferralSources()]);
  if (!account || account.role === 'ADMIN') notFound();
  const linkedStudentCandidates = account.role === 'STUDENT' ? await getLinkedStudentCandidates(account.id) : [];
  return <AccountEditForm account={account} referralSources={referralSources} linkedStudentCandidates={linkedStudentCandidates} />;
}
