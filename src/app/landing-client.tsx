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
  const [portalMode, setPortalMode] = React.useState<'STUDENT' | 'TUTOR'>('STUDENT');
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(students[0]?.id || '');
  const [selectedTutorId, setSelectedTutorId] = React.useState<string>(tutors[0]?.id || '');
  const [now, setNow] = React.useState<number>(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const currentTutor = tutors.find((t) => t.id === selectedTutorId) || tutors[0];
  const nextSession = upcomingSessions[0] || null;

  const calculateCountdown = (targetDateStr: string) => {
    const targetMs = new Date(targetDateStr).getTime();
    const diffMs = targetMs - now;

    if (diffMs <= 0) {
      return { hasStarted: true, formatted: 'In Session / Check-In Open' };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return {
      hasStarted: false,
      formatted: `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`,
    };
  };

  const nextTimer = nextSession ? calculateCountdown(nextSession.startTime) : null;

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-8">
      {/* 1. HERO & PROMINENT QUICK-DASHBOARD (CENTERED UNDER NAVBAR) */}
      <section className="text-center space-y-6 pt-2">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            <span>🚀</span>
            <span>Hands-on STEM & Robotics Academy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Inspiring Young Minds to Code & Build
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Practical robotics, electronics, and coding mentorship for kids and teens.
          </p>
        </div>

        {/* PROMINENT CENTER CARD: WALLET + NEXT LECTURE + TIMER (EXACT SPEC) */}
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden text-left">
          {/* Top Switcher: Student vs Tutor */}
          <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 gap-1.5">
            <button
              onClick={() => setPortalMode('STUDENT')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                portalMode === 'STUDENT'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              👦 Student & Parent Portal
            </button>
            <button
              onClick={() => setPortalMode('TUTOR')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                portalMode === 'TUTOR'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              👨‍🏫 Tutor Portal
            </button>
          </div>

          <div className="p-6 space-y-5">
            {portalMode === 'STUDENT' ? (
              <>
                {/* Header & Student Switcher */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Student Account</span>
                  {students.length > 1 && (
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-md px-2 py-1"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 1. WALLET IN THE MIDDLE AT THE TOP */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-center space-y-1">
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                    Available Wallet Balance
                  </span>
                  <div
                    className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                      currentStudent?.balance < 0 ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    Wallet: {formatEGP(currentStudent?.balance || 0)}
                  </div>
                  {currentStudent?.isOverdraft && (
                    <span className="inline-block text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Post-paid credit active (overdraft permitted)
                    </span>
                  )}
                </div>

                {/* 2. UNDER IT: NEXT SESSION & LIVE START TIMER */}
                {nextSession ? (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600 uppercase tracking-wider">
                        Next Upcoming Session
                      </span>
                      <span className="text-slate-400 font-medium">
                        Instructor: <strong className="text-slate-700">{nextSession.tutorName}</strong>
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <h3 className="text-base font-bold text-slate-900">{nextSession.title}</h3>
                      <div className="text-xs text-slate-500">
                        {new Date(nextSession.startTime).toLocaleString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>

                      {/* Live Timer to when it will start */}
                      <div className="p-3 rounded-lg bg-slate-900 text-white flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">
                            Session Starts In
                          </span>
                          <span className="font-mono text-lg sm:text-xl font-bold text-red-400">
                            {nextTimer?.formatted}
                          </span>
                        </div>
                        <Link href={`/attend/${nextSession.token}`}>
                          <button className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow transition-colors">
                            Check In &rarr;
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-400">
                    No sessions scheduled. Check back soon.
                  </div>
                )}
              </>
            ) : (
              /* TUTOR VIEW: UPCOMING LECTURES */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Tutor: {currentTutor?.name}</span>
                  {tutors.length > 1 && (
                    <select
                      value={selectedTutorId}
                      onChange={(e) => setSelectedTutorId(e.target.value)}
                      className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-md px-2 py-1"
                    >
                      {tutors.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Upcoming Lecture Timetable
                  </span>

                  {currentTutor?.sessions && currentTutor.sessions.length > 0 ? (
                    currentTutor.sessions.map((sess) => {
                      const timer = calculateCountdown(sess.startTime);
                      return (
                        <div key={sess.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-sm font-bold text-slate-900">{sess.title}</div>
                              <div className="text-xs text-slate-500">
                                {new Date(sess.startTime).toLocaleString([], {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-red-600">
                              {timer.formatted}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                            <span className="text-slate-500">Share token link:</span>
                            <CopyTokenButton token={sess.token} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No upcoming lectures assigned.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. SIMPLE HOW-IT-WORKS FOR PARENTS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1.5 text-center">
          <div className="text-2xl">🗓️</div>
          <h4 className="text-sm font-bold text-slate-900">1. Convenient Schedule</h4>
          <p className="text-xs text-slate-500">
            Flexible weekly timetable organized to fit school schedules.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1.5 text-center">
          <div className="text-2xl">⚡</div>
          <h4 className="text-sm font-bold text-slate-900">2. Instant Check-In</h4>
          <p className="text-xs text-slate-500">
            One tap with the tutor’s link when class starts. No apps needed.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1.5 text-center">
          <div className="text-2xl">💳</div>
          <h4 className="text-sm font-bold text-slate-900">3. Family Wallet</h4>
          <p className="text-xs text-slate-500">
            Transparent balance ledger with flexible overdraft credit support.
          </p>
        </div>
      </section>
    </div>
  );
}
