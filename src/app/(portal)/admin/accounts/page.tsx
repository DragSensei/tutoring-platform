import { AccountsView } from './_components/accounts-view';
import { getAccounts } from './_components/accounts-data';
import { getReferralSources } from '@/features/accounts/server/account-actions';
import { getLinkedStudentCandidates } from '@/features/accounts/server/linked-students';

export const dynamic = 'force-dynamic';

export default async function AdminAccountsPage({ searchParams }: { searchParams: { referralSourceId?: string; updated?: string } }) {
  const [accounts, referralSources, linkedStudentCandidates] = await Promise.all([getAccounts(), getReferralSources(), getLinkedStudentCandidates()]);

  return <AccountsView accounts={accounts} referralSources={referralSources} linkedStudentCandidates={linkedStudentCandidates} initialReferralSourceId={searchParams.referralSourceId ?? ''} accountUpdated={searchParams.updated === '1'} />;
}
