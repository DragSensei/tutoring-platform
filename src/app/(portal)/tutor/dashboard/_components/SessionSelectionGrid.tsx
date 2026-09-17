'use client';

import * as React from 'react';
import { BookOpen, ShieldCheck, Users } from 'lucide-react';
import { SessionCourseCard } from './SessionCourseCard';
import { CopyTokenButton } from '@/features/sessions/components/copy-token-button';
import { formatSessionCode } from '@/shared/utils/session-code';
import type { GadwalSessionItem } from '@/features/sessions/types';

interface SessionSelectionGridProps {
  sessions: GadwalSessionItem[];
}

export function SessionSelectionGrid({ sessions }: SessionSelectionGridProps) {
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(
    sessions.length > 0 ? sessions[0].id : null
  );

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || null;

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-12 text-center shadow-sm">
        <BookOpen className="mx-auto h-10 w-10 text-stone-400" />
        <h3 className="mt-3 text-lg font-semibold text-stone-900">No Course Sessions Found</h3>
        <p className="mt-1 text-sm text-stone-500">
          You currently have no course sessions assigned. Check with your platform administrator to allocate your cohorts.
        </p>
      </div>
    );
  }

  const selectedCode = selectedSession
    ? selectedSession.sessionCode ||
      formatSessionCode({
        title: selectedSession.title,
        startTime: selectedSession.startTime,
        endTime: selectedSession.endTime,
      })
    : '';

  const selectedStudents = selectedSession?.assignedStudents || [];

  return (
    <section className="space-y-6 pt-4">
      {/* Selected Session Active Recording Bar */}
      {selectedSession && (
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="rounded-lg bg-red-600 p-2.5 text-white flex-shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 font-mono">
                  Selected Session: {selectedCode}
                </span>
                <span className="text-xs text-stone-400">&bull;</span>
                <span className="text-xs font-medium text-stone-600">
                  {selectedStudents.length} Students Assigned
                </span>
              </div>
              <h4 className="text-sm font-bold text-stone-900 mt-0.5">
                {selectedSession.title}
              </h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Students: <strong className="text-stone-800">{selectedStudents.length > 0 ? selectedStudents.join(', ') : 'None assigned yet'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
            <span className="text-xs text-stone-500 hidden sm:inline">Share Token:</span>
            <CopyTokenButton token={selectedSession.token} />
          </div>
        </div>
      )}

      {/* Section Heading */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Pick a Course Session
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Click any session card below to select it and record student attendance.
          </p>
        </div>
        <div className="text-xs font-semibold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-lg self-start sm:self-auto">
          {sessions.length} {sessions.length === 1 ? 'Session Available' : 'Sessions Available'}
        </div>
      </div>

      {/* Clickable Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sessions.map((session) => (
          <SessionCourseCard
            key={session.id}
            session={session}
            isSelected={session.id === selectedSessionId}
            onSelect={(s) => setSelectedSessionId(s.id)}
          />
        ))}
      </div>
    </section>
  );
}
