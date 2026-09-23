import { getAdminFinanceReport } from '@/features/finances/server/finance-actions';
import { AdminFinancesView } from './_components/admin-finances-view';

export const dynamic = 'force-dynamic';

export default async function AdminFinancesPage({ searchParams }: { searchParams: { month?: string; from?: string; to?: string } }) {
  const report = await getAdminFinanceReport(searchParams);
  return <AdminFinancesView report={report} />;
}
