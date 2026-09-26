import { MonthlyReceivablesView } from '../_components/monthly-receivables-view';
import { confirmMonthlyReceivables, previewMonthlyReceivables } from './actions';

export default function StudentReceivablesPage() {
  return <MonthlyReceivablesView onPreview={previewMonthlyReceivables} onConfirm={confirmMonthlyReceivables} />;
}
