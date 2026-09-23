import { AccountsView } from './_components/accounts-view';
import { getAccounts } from './_components/accounts-data';
import { getReferralSources } from '@/features/accounts/server/account-actions';

export const dynamic = 'force-dynamic';

export default async function AdminAccountsPage({ searchParams }: { searchParams: { referralSourceId?: string } }) {
  const [accounts, referralSources] = await Promise.all([getAccounts(), getReferralSources()]);

  return <AccountsView accounts={accounts} referralSources={referralSources} initialReferralSourceId={searchParams.referralSourceId ?? ''} />;
}
