'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck, Edit3, ArrowLeft, CheckCircle2, Users, Calendar } from 'lucide-react';
import { DashboardHeader } from '../../dashboard/_components/DashboardHeader';
import { AttendanceRecordingDrawer } from '../../dashboard/_components/attendance-drawer';
import {
  getStoredSessions,
  saveStoredSessions,
} from '../../dashboard/_components/session-storage';
import { formatSessionCode } from '@/shared/utils/session-code';
import { formatEGP } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/date-format';
import type { TutorDashboardData } from '../../dashboard/_components/dashboard-data';
import type { GadwalSessionItem } from '@/features/sessions/types';

export function TutorHistoryView({
  tutor,
  sessions: initialSessions,
}: TutorDashboardData) {
  const [allSessions, setAllSessions] = React.useState<GadwalSessionItem[]>(initialSessions);
  const [drawerSession, setDrawerSession] = React.useState<GadwalSessionItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [feedbackNotice, setFeedbackNotice] = React.useState<string | null>(null);

  // Sync client-persisted sessions on mount
  React.useEffect(() => {
    const stored = getStoredSessions(initialSessions);
    setAllSessions(stored);
  }, [initialSessions]);

  const activeSessions = allSessions.filter((s) => s.status !== 'COMPLETED');
  const completedSessions = allSessions.filter((s) => s.status === 'COMPLETED');

  const handleOpenEdit = (session: GadwalSessionItem) => {
    setDrawerSession(session);
    setIsDrawerOpen(true);
  };

  const handleSaveAttendance = (sessionId: string, presentStudentIds: string[]) => {
    const updated = allSessions.map((session) => {
      if (session.id !== sessionId) return session;

      const updatedRoster = (session.roster || []).map((student) => {
        const isPresent = presentStudentIds.includes(student.id);
        const deduction = isPresent ? session.price : 0;
        return {
          ...student,
          attended: isPresent,
          walletBalance: student.walletBalance - deduction,
        };
      });

      const attendedNames = updatedRoster
        .filter((st) => st.attended)
        .map((st) => st.name);

      return {
        ...session,
        roster: updatedRoster,
        assignedStudents: attendedNames,
        attendeeCount: attendedNames.length,
      };
    });

    setAllSessions(updated);
    saveStoredSessions(updated);
    setFeedbackNotice('Attendance adjustments saved successfully.');
  };

  return (
    <div className="space-y-8">
      {/* Faculty Identity Bar & Navigation */}
      <DashboardHeader
        tutorName={tutor.name}
        activeTab="history"
        activeCount={activeSessions.length}
        historyCount={completedSessions.length}
      />

      {feedbackNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-emerald-900">{feedbackNotice}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700">
              Past & Completed Sessions
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Review recorded student attendance, cohort capacity, and adjust presence records.
            </p>
          </div>

          <Link
            href="/tutor/agenda"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Agenda</span>
          </Link>
        </div>

        {completedSessions.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white p-12 text-center shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-stone-800">No Completed Sessions Yet</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Sessions will move here once you take attendance on the Active Agenda. You will always be able to re-edit attendance here if needed.
            </p>
            <div className="pt-2">
              <Link
                href="/tutor/agenda"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-brand-primary text-white hover:bg-brand-hover transition-all shadow-xs"
              >
                <span>Go to Active Agenda</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 overflow-hidden shadow-xs">
            {completedSessions.map((session) => {
              const sessionCode =
                session.sessionCode ||
                formatSessionCode({
                  title: session.title,
                  startTime: session.startTime,
                  endTime: session.endTime,
                });
              const roster = session.roster || [];
              const attendedCount = session.attendeeCount || roster.filter((r) => r.attended).length;
              const maxCap = session.sessionType === 'GROUP' ? 4 : 1;
              const studentsAttended =
                session.assignedStudents && session.assignedStudents.length > 0
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
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Completed
                      </span>
                      <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        {session.sessionType} (Cap: {maxCap})
                      </span>
                      <span className="text-xs text-stone-400 font-mono">
                        {formatDateTime(session.startTime)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-stone-800">{session.title}</h3>

                    {/* Attended Students List */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-xs text-stone-500 font-medium mr-1 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-stone-400" />
                        Attended ({attendedCount}/{roster.length || maxCap}):
                      </span>
                      {studentsAttended.length > 0 ? (
                        studentsAttended.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 text-[11px] font-medium bg-stone-100 border border-stone-200 text-stone-700 px-2 py-0.5 rounded-md"
                          >
                            <span className="text-emerald-600 font-bold">&bull;</span>
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-stone-400 italic">No students marked present</span>
                      )}
                    </div>
                  </div>

                  {/* Right side: Fee & Edit Action */}
                  <div className="flex items-center gap-4 self-end md:self-center flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] text-stone-400 font-medium uppercase tracking-wider">
                        Batch Total
                      </p>
                      <p className="font-mono text-sm font-bold text-stone-900">
                        {formatEGP(attendedCount * session.price)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(session)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 shadow-xs transition-all active:scale-95"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-stone-500" />
                      <span>Edit Attendance</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Re-usable Attendance Drawer in Edit Mode */}
      <AttendanceRecordingDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        session={drawerSession}
        isEditMode={true}
        onSubmitBatch={handleSaveAttendance}
      />
    </div>
  );
}
