import { TutorKPICard } from '@/features/sessions/components/tutor-kpi-card';
import { GadwalTable } from '@/features/sessions/components/gadwal-table';
import { GadwalSessionItem, TutorKPIs } from '@/features/sessions/types';

interface TutorAgendaViewProps {
  sessions: GadwalSessionItem[];
  kpis: TutorKPIs;
}

export function TutorAgendaView({ sessions, kpis }: TutorAgendaViewProps) {
  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-2">
          Tutor Abstraction Portal
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome back, {kpis.tutorName}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Zero manual roster duties. Simply share your session token links with students.
        </p>
      </div>

      <TutorKPICard kpis={kpis} />

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Your Session Agenda</h2>
        <GadwalTable sessions={sessions} showTutorColumn={false} />
      </div>
    </div>
  );
}
