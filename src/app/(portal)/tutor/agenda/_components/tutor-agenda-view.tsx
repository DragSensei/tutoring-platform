'use client';

import * as React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { DashboardHeader } from '../../dashboard/_components/DashboardHeader';
import { ClosestSessionTimer } from '../../dashboard/_components/ClosestSessionTimer';
import { SessionSelectionGrid } from '../../dashboard/_components/SessionSelectionGrid';
import { TutorKPICard } from '@/features/sessions/components/tutor-kpi-card';
import { GadwalTable } from '@/features/sessions/components/gadwal-table';
import type { TutorDashboardData } from '../../dashboard/_components/dashboard-data';

export function TutorAgendaView({
  tutor,
  closestSession,
  sessions,
  kpis,
}: TutorDashboardData) {
  const [showTable, setShowTable] = React.useState(false);

  return (
    <div className="space-y-8">
      {/* Faculty Identity Bar with Timetable Toggle */}
      <DashboardHeader
        tutorName={tutor.name}
        onToggleTable={() => setShowTable((prev) => !prev)}
        showTable={showTable}
      />

      {/* Top Middle: Live countdown timer with separate boxed units */}
      <ClosestSessionTimer closestSession={closestSession} />

      {/* Underneath: Clickable course cards with session codes & student rosters */}
      <SessionSelectionGrid sessions={sessions} />

      {/* Optional Full Timetable & KPI Section */}
      <div id="timetable" className="border-t border-stone-200/80 pt-6">
        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white p-4 text-left shadow-xs transition-colors hover:bg-stone-50 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Full Gadwal Timetable & KPIs
              </h3>
              <p className="text-xs text-stone-500">
                {showTable
                  ? 'Click to collapse tabular view'
                  : 'Click to view complete table and monthly teaching volume'}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${
              showTable ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showTable && (
          <div className="mt-6 space-y-6">
            {kpis && <TutorKPICard kpis={kpis} />}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-stone-700 mb-3">
                All Scheduled Sessions
              </h4>
              <GadwalTable sessions={sessions} showTutorColumn={false} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
