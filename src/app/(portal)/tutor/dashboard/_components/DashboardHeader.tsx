import Link from 'next/link';

interface DashboardHeaderProps {
  tutorName: string;
  activeTab?: 'agenda' | 'history';
  activeCount?: number;
  historyCount?: number;
}

export function DashboardHeader({
  tutorName,
  activeTab = 'agenda',
  activeCount,
  historyCount,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-4">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center rounded-md bg-brand-subtle border border-brand-border/60 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-primary">
          Faculty Portal
        </span>
        <span className="text-xs sm:text-sm font-semibold text-stone-800">
          {tutorName}
        </span>
      </div>

      <nav className="flex items-center gap-1.5 self-start sm:self-auto bg-stone-100 p-1 rounded-xl">
        <Link
          href="/tutor/agenda"
          className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'agenda'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>Active Agenda</span>
          {typeof activeCount === 'number' && (
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                activeTab === 'agenda'
                  ? 'bg-white/25 text-white'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {activeCount}
            </span>
          )}
        </Link>

        <Link
          href="/tutor/history"
          className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>Past Sessions</span>
          {typeof historyCount === 'number' && (
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                activeTab === 'history'
                  ? 'bg-white/25 text-white'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {historyCount}
            </span>
          )}
        </Link>
      </nav>
    </div>
  );
}
