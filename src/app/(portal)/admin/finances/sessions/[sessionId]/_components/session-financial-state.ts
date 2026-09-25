type FinancialStateInput = {
  historicalOnly: boolean;
  status: string;
  attendanceSavedAt: string | null;
  finalizedAt: string | null;
};

export function sessionFinancialState(session: FinancialStateInput) {
  if (session.historicalOnly) return { label: 'Historical record', detail: 'Excluded from current financial settlement.' };
  if (session.finalizedAt) return { label: 'Settled', detail: 'Attendance finalization is recorded.' };
  if (session.attendanceSavedAt) return { label: 'Settlement pending', detail: 'Attendance is saved; financial finalization is not recorded.' };
  if (session.status === 'COMPLETED') return { label: 'Settlement data missing', detail: 'Session is completed without a recorded finalization timestamp.' };
  return { label: 'Not finalized', detail: 'Financial settlement has not been recorded.' };
}

export function sumMoney(values: string[]): string {
  const cents = values.reduce((total, value) => {
    const [whole, fraction = ''] = value.split('.');
    const sign = whole.startsWith('-') ? -1n : 1n;
    return total + sign * (BigInt(whole.replace('-', '')) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2)));
  }, 0n);
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}
