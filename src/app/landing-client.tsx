'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { formatEGP } from '@/shared/utils/currency';
import { CopyTokenButton } from '@/features/sessions/components/copy-token-button';

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  balance: number;
  isOverdraft: boolean;
}

export interface UpcomingSessionItem {
  id: string;
  title: string;
  tutorName: string;
  tutorId: string;
  sessionType: 'PRIVATE' | 'GROUP';
  startTime: string;
  deadline: string;
  token: string;
  status: string;
}

export interface TutorProfile {
  id: string;
  name: string;
  email: string;
  sessions: UpcomingSessionItem[];
}

interface LandingClientProps {
  students: StudentProfile[];
  tutors: TutorProfile[];
  upcomingSessions: UpcomingSessionItem[];
}

export function LandingClient({ students, tutors, upcomingSessions }: LandingClientProps) {
  const [roleMode, setRoleMode] = React.useState<'STUDENT' | 'TUTOR'>('STUDENT');
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(
    students[0]?.id || ''
  );
  const [selectedTutorId, setSelectedTutorId] = React.useState<string>(
    tutors[0]?.id || ''
  );
  const [now, setNow] = React.useState<number>(Date.now());

  // Update live second counter
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const currentTutor = tutors.find((t) => t.id === selectedTutorId) || tutors[0];

  // Next session for students
  const nextSession = upcomingSessions[0] || null;

  // Countdown calculations
  const calculateCountdown = (targetDateStr: string) => {
    const targetMs = new Date(targetDateStr).getTime();
    const diffMs = targetMs - now;

    if (diffMs <= 0) {
      return { hasStarted: true, formatted: 'Starting Now / In Session' };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return {
      hasStarted: false,
      formatted: `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`,
    };
  };

  const nextSessionTimer = nextSession ? calculateCountdown(nextSession.startTime) : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Role Switcher Pill */}
      <div className="flex justify-center">
        <div className="p-1 bg-slate-200/80 rounded-xl flex items-center gap-1 text-xs font-bold">
          <button
            onClick={() => setRoleMode('STUDENT')}
            className={`px-5 py-2 rounded-lg transition-all ${
              roleMode === 'STUDENT'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👦 Student View
          </button>
          <button
            onClick={() => setRoleMode('TUTOR')}
            className={`px-5 py-2 rounded-lg transition-all ${
              roleMode === 'TUTOR'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👨‍🏫 Tutor View
          </button>
        </div>
      </div>

      {roleMode === 'STUDENT' ? (
        /* ================= STUDENT 1-PAGE VIEW ================= */
        <motion.div
          key="student-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6"
        >
          {/* Top: Student Selector Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs text-slate-400 font-medium block">STUDENT ACCOUNT</span>
              <div className="text-base font-bold text-slate-800">{currentStudent?.name}</div>
            </div>

            {students.length > 1 && (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    Switch Student: {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Core Balance Display: Prominently in the middle */}
          <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Available Wallet Balance
            </span>
            <div
              className={`text-4xl sm:text-5xl font-extrabold font-mono tracking-tight ${
                currentStudent?.balance < 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {formatEGP(currentStudent?.balance || 0)}
            </div>
            {currentStudent?.isOverdraft && (
              <span className="inline-block text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 mt-1">
                ⚠️ Account in Overdraft (Post-Paid Credit Allowed)
              </span>
            )}
          </div>

          {/* Under It: Next Session & Timer */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Next Upcoming Session
              </span>
              {nextSession && (
                <span className="text-xs px-2 py-0.5 font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
                  {nextSession.sessionType}
                </span>
              )}
            </div>

            {nextSession ? (
              <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{nextSession.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Instructor: <span className="font-semibold text-slate-700">{nextSession.tutorName}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Scheduled for:{' '}
                    <span className="font-medium text-slate-800">
                      {new Date(nextSession.startTime).toLocaleString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                </div>

                {/* Live Countdown Box */}
                <div className="p-3.5 rounded-lg bg-slate-900 text-white flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-400 block font-medium">
                      TIME UNTIL SESSION
                    </span>
                    <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-red-400">
                      {nextSessionTimer?.formatted}
                    </span>
                  </div>

                  <Link href={`/attend/${nextSession.token}`}>
                    <button className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow transition-all hover:scale-[1.02] active:scale-[0.98]">
                      Check In &rarr;
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No upcoming sessions scheduled right now.
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        /* ================= TUTOR VIEW ================= */
        <motion.div
          key="tutor-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6"
        >
          {/* Tutor Selector Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs text-slate-400 font-medium block">TUTOR PORTAL</span>
              <div className="text-base font-bold text-slate-800">{currentTutor?.name}</div>
            </div>

            {tutors.length > 1 && (
              <select
                value={selectedTutorId}
                onChange={(e) => setSelectedTutorId(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>
                    Switch Tutor: {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Upcoming Lectures List for Tutor */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Your Upcoming Lectures
            </span>

            {currentTutor?.sessions && currentTutor.sessions.length > 0 ? (
              <div className="space-y-3">
                {currentTutor.sessions.map((sess) => {
                  const timer = calculateCountdown(sess.startTime);
                  return (
                    <div
                      key={sess.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                              {sess.sessionType}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(sess.startTime).toLocaleString([], {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900 mt-1">{sess.title}</h4>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">STARTS IN</span>
                          <span className="font-mono text-sm font-bold text-red-600">
                            {timer.formatted}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                        <span className="text-slate-500">Share token link with students:</span>
                        <CopyTokenButton token={sess.token} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                You have no scheduled lectures upcoming.
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
