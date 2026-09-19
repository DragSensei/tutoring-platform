'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { DashboardHeader } from '../../dashboard/_components/DashboardHeader';
import { ClosestSessionTimer } from '../../dashboard/_components/ClosestSessionTimer';
import { SessionSelectionGrid } from '../../dashboard/_components/SessionSelectionGrid';
import { AttendanceRecordingDrawer } from '../../dashboard/_components/attendance-drawer';
import {
  getStoredSessions,
  saveStoredSessions,
} from '../../dashboard/_components/session-storage';
import { findClosestSessionDue } from '../../dashboard/_components/timer-utils';
import type { TutorDashboardData } from '../../dashboard/_components/dashboard-data';
import type { GadwalSessionItem } from '@/features/sessions/types';

export function TutorAgendaView({
  tutor,
  closestSession: initialClosestSession,
  sessions: initialSessions,
}: TutorDashboardData) {
  const [allSessions, setAllSessions] = React.useState<GadwalSessionItem[]>(initialSessions);
  const [drawerSession, setDrawerSession] = React.useState<GadwalSessionItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [successNotice, setSuccessNotice] = React.useState<{
    title: string;
    count: number;
  } | null>(null);

  // Sync client-persisted sessions on mount
  React.useEffect(() => {
    const stored = getStoredSessions(initialSessions);
    setAllSessions(stored);
  }, [initialSessions]);

  const activeSessions = allSessions.filter((s) => s.status !== 'COMPLETED');
  const completedSessions = allSessions.filter((s) => s.status === 'COMPLETED');

  // Compute live closest active session
  const closestSession = React.useMemo(() => {
    return findClosestSessionDue(activeSessions) || initialClosestSession;
  }, [activeSessions, initialClosestSession]);

  const handleOpenAttendance = (session: GadwalSessionItem) => {
    setDrawerSession(session);
    setIsDrawerOpen(true);
  };

  const handleBatchSubmit = (sessionId: string, presentStudentIds: string[]) => {
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
        status: 'COMPLETED' as const,
        roster: updatedRoster,
        assignedStudents: attendedNames,
        attendeeCount: attendedNames.length,
      };
    });

    setAllSessions(updated);
    saveStoredSessions(updated);

    const targetSession = allSessions.find((s) => s.id === sessionId);
    setSuccessNotice({
      title: targetSession?.title || 'Session',
      count: presentStudentIds.length,
    });
  };

  return (
    <div className="space-y-8">
      {/* Faculty Identity Bar & Sub-Nav Tabs */}
      <DashboardHeader
        tutorName={tutor.name}
        activeTab="agenda"
        activeCount={activeSessions.length}
        historyCount={completedSessions.length}
      />

      {/* Success Notification Banner after moving session to Past */}
      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-900">
                Attendance Recorded &bull; Session Completed!
              </p>
              <p className="text-xs text-emerald-700">
                {successNotice.count} student(s) marked. &quot;{successNotice.title}&quot; has been moved to Past Sessions.
              </p>
            </div>
          </div>

          <Link
            href="/tutor/history"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-all self-start sm:self-auto shadow-xs"
          >
            <span>View in Past Sessions</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Top Middle: Live countdown timer with separate boxed units */}
      <ClosestSessionTimer closestSession={closestSession} />

      {/* Active Course Sessions with Drawer Trigger */}
      <SessionSelectionGrid
        sessions={activeSessions}
        onSelectSession={handleOpenAttendance}
      />

      {/* Interactive Attendance Recording Drawer */}
      <AttendanceRecordingDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        session={drawerSession}
        isEditMode={false}
        onSubmitBatch={handleBatchSubmit}
      />
    </div>
  );
}
