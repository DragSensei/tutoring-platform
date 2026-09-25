import { getAdminFinanceReport } from '@/features/finances/server/finance-actions';
import { FinancePayablesView } from '../_components/finance-payables-view';

export const dynamic = 'force-dynamic';

export default async function TutorFinancesPage({ searchParams }: { searchParams: { cycle?: string } }) {
  const report = await getAdminFinanceReport(searchParams);
  return <FinancePayablesView report={report} mode="tutor" />;
}
