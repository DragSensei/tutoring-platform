import { AccountsView } from './_components/accounts-view';
import { getAccounts } from './_components/accounts-data';

export const dynamic = 'force-dynamic';

export default async function AdminAccountsPage() {
  const accounts = await getAccounts();

  return <AccountsView accounts={accounts} />;
}
