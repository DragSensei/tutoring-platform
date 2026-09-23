'use client';

import React from 'react';
import Link from 'next/link';
import { Edit3, ArrowLeft, CheckCircle2, Users, Calendar } from 'lucide-react';
import { formatSessionCode } from '@/shared/utils/session-code';
import { formatDateTime } from '@/shared/utils/date-format';
import type { TutorDashboardData } from '../../dashboard/_components/dashboard-data';

export function TutorHistoryView({
  tutor,
  sessions: initialSessions,
}: TutorDashboardData) {
  const historySessions = initialSessions.filter((s) => s.historicalOnly || s.status === 'COMPLETED');

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-stone-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex rounded-md border border-brand-border/60 bg-brand-subtle px-2 py-1 text-xs font-semibold text-brand-primary">Faculty portal</span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">Session history</h1>
          <p className="mt-1 text-sm text-stone-500">Review {tutor.name}&apos;s saved attendance and pre-system schedule records.</p>
        </div>
        <Link href="/tutor/agenda" className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to agenda
        </Link>
      </header>

      {/* Main Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700">
              Past & Completed Sessions
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Review recorded attendance or view clearly marked pre-system schedules.
            </p>
          </div>

        </div>

        {historySessions.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white p-12 text-center shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-stone-800">No History Yet</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Sessions appear here after attendance is saved. Any pre-system schedule entries are labeled and cannot be edited as attendance.
            </p>
            <div className="pt-2">
              <Link
                href="/tutor/agenda"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-brand-hover"
              >
                <span>Go to Active Agenda</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 overflow-hidden shadow-xs">
            {historySessions.map((session) => {
              const sessionCode =
                session.sessionCode ||
                formatSessionCode({
                  title: session.title,
                  startTime: session.startTime,
                  endTime: session.endTime,
                });
              const roster = session.roster || [];
              const attendedCount = session.historicalOnly ? 0 : session.attendeeCount || roster.filter((r) => r.attended).length;
              const maxCap = session.sessionType === 'GROUP' ? 4 : 1;
              const studentsDisplayed = session.historicalOnly
                ? session.assignedStudents || roster.map((student) => student.name)
                : session.assignedStudents && session.assignedStudents.length > 0
                  ? session.assignedStudents
                  : roster.filter((r) => r.attended).map((r) => r.name);

              return (
                <div
                  key={session.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 hover:bg-stone-50/40 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold tracking-tight text-stone-900">
                        {sessionCode}
                      </span>
                      {session.historicalOnly ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">Pre-system schedule</span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Completed
                        </span>
                      )}
                      <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        {session.sessionType} (Cap: {maxCap})
                      </span>
                      <span className="text-xs text-stone-400 font-mono">
                        {formatDateTime(session.startTime)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-stone-800">{session.title}</h3>

                    {session.attendanceNotes && (
                      <p className="text-xs text-stone-600">{session.attendanceNotes}</p>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-xs text-stone-500 font-medium mr-1 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-stone-400" />
                        {session.historicalOnly ? 'Scheduled students:' : `Attended (${attendedCount}/${roster.length || maxCap}):`}
                      </span>
                      {studentsDisplayed.length > 0 ? (
                        studentsDisplayed.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 text-[11px] font-medium bg-stone-100 border border-stone-200 text-stone-700 px-2 py-0.5 rounded-md"
                          >
                            <span className="text-emerald-600 font-bold">&bull;</span>
                            {name}
                          </span>
                        ))
                      ) : session.historicalOnly ? (
                        <span className="text-xs text-stone-400 italic">No roster was recorded</span>
                      ) : (
                        <span className="text-xs text-stone-400 italic">No students marked present</span>
                      )}
                    </div>
                  </div>

                  {/* Right side: Edit Action */}
                  {!session.historicalOnly && (
                    <div className="flex items-center gap-4 self-end md:self-center flex-shrink-0">
                      <Link
                        href={`/tutor/attendance/${session.id}`}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-stone-800 shadow-xs transition-colors hover:bg-stone-50"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-stone-500" />
                        <span>Edit Attendance</span>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
