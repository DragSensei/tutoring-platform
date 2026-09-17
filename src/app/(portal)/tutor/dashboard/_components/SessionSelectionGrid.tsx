'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
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

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-10 text-center shadow-xs">
        <p className="text-sm font-medium text-stone-600">No scheduled course sessions found.</p>
      </div>
    );
  }

  return (
    <section className="space-y-3 pt-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Course Sessions
        </h3>
        <span className="text-xs text-stone-400">
          {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
        </span>
      </div>

      {/* Rows Container: Stack of rows (not in a table element) */}
      <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 overflow-hidden shadow-xs">
        {sessions.map((session) => {
          const isSelected = session.id === selectedSessionId;
          const sessionCode =
            session.sessionCode ||
            formatSessionCode({
              title: session.title,
              startTime: session.startTime,
              endTime: session.endTime,
            });
          const students = session.assignedStudents || [];
          const studentCount = students.length > 0 ? students.length : session.attendeeCount || 0;

          return (
            <div
              key={session.id}
              onClick={() => setSelectedSessionId(session.id)}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-stone-50/90 ring-1 ring-inset ring-stone-900/10'
                  : 'hover:bg-stone-50/50'
              }`}
            >
              {/* Left: Session name & little description under it */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm sm:text-base font-bold tracking-tight text-stone-900">
                    {sessionCode}
                  </span>
                  {session.sessionType === 'PRIVATE' && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                      1-on-1
                    </span>
                  )}
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-700 bg-stone-200/70 px-2 py-0.5 rounded-full">
                      <Check className="h-3 w-3 text-stone-700" /> Selected
                    </span>
                  )}
                </div>

                {/* Description under the name in little */}
                <p className="text-xs text-stone-500 mt-1 line-clamp-1">
                  <span className="text-stone-700">{session.title}</span>
                  {students.length > 0 ? (
                    <span className="text-stone-400">
                      {' '}
                      &bull; Students: <strong className="font-medium text-stone-600">{students.join(', ')}</strong>
                    </span>
                  ) : null}
                </p>
              </div>

              {/* Right: Number of students & Copy Attendance Link button */}
              <div className="flex items-center gap-4 self-end sm:self-center flex-shrink-0">
                <div className="text-right">
                  <div className="text-sm font-semibold text-stone-800 tabular-nums">
                    {studentCount}
                    <span className="text-xs font-normal text-stone-400 ml-1">
                      {studentCount === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <CopyTokenButton token={session.token} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
