'use client';

import * as React from 'react';
import { Calendar, CheckCircle2, Clock, ShieldCheck, User } from 'lucide-react';
import { formatEGP } from '@/shared/utils/currency';
import { formatSessionSchedule } from '@/shared/utils/date-format';
import {
  computeSessionCountdown,
  getSessionTimingTarget,
} from '@/shared/utils/session-timing';

export interface ScheduledLecture {
  id: string;
  title: string;
  tutorName: string;
  startTime: string;
  endTime: string;
  deadline: string;
  token: string;
  price: number;
  sessionType: string;
  isWithinActiveWindow: boolean;
  isAttended?: boolean;
}

export function UpcomingLecturesCard({ lecture }: { lecture: ScheduledLecture | null }) {
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  if (!lecture) {
    return (
      <div className="flex items-center gap-3.5 rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
          <Calendar className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-stone-900">No lectures scheduled this week</h2>
          <p className="mt-0.5 text-xs text-stone-500">
            No lectures or review sessions are scheduled for the current week. Check back later or contact your academy advisor.
          </p>
        </div>
      </div>
    );
  }

  const timing = now ? getSessionTimingTarget(lecture.startTime, lecture.endTime, now) : null;
  const countdown = timing && now
    ? computeSessionCountdown(timing.targetTimestamp, now)
    : null;
  const attendanceStatus = lecture.isAttended
    ? { label: 'Attendance recorded', icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' }
    : lecture.isWithinActiveWindow
      ? { label: 'Session active', icon: Clock, className: 'border-amber-200 bg-amber-50 text-amber-800' }
      : { label: 'Attendance pending', icon: ShieldCheck, className: 'border-stone-200 bg-stone-50 text-stone-600' };
  const AttendanceIcon = attendanceStatus.icon;
  const timingLabel = timing?.hasEnded
    ? 'Session finished'
    : timing?.isActive
      ? 'Session ends in'
      : 'Session starts in';

  return (
    <section className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs sm:p-6" aria-labelledby="next-session-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-brand-border/60 bg-brand-subtle px-2 py-0.5 text-xs font-semibold text-brand-primary">Next session</span>
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium capitalize text-stone-600">{lecture.sessionType.toLowerCase()}</span>
          </div>
          <h2 id="next-session-heading" className="mt-3 font-serif text-xl font-medium text-stone-900 sm:text-2xl">{lecture.title}</h2>
        </div>
        <span className={`inline-flex min-h-[44px] w-fit items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${attendanceStatus.className}`}>
          <AttendanceIcon className="h-4 w-4" aria-hidden="true" /> {attendanceStatus.label}
        </span>
      </div>

      <div className="mt-6 rounded-xl bg-stone-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{timingLabel}</p>
        <p suppressHydrationWarning className="mt-1 font-mono text-3xl font-bold tabular-nums text-stone-900">
          {timing?.hasEnded ? '00:00:00' : countdown?.formatted || '--:--:--'}
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-5 border-t border-stone-100 pt-5 sm:grid-cols-3">
        <div className="flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 text-stone-400" aria-hidden="true" />
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-stone-400">Tutor</dt>
            <dd className="mt-0.5 text-sm font-medium text-stone-800">{lecture.tutorName}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 text-stone-400" aria-hidden="true" />
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-stone-400">Date and time</dt>
            <dd className="mt-0.5 text-sm font-medium text-stone-800">{formatSessionSchedule(lecture.startTime)}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Calendar className="mt-0.5 h-4 w-4 text-stone-400" aria-hidden="true" />
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-stone-400">Session fee</dt>
            <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-brand-primary">{formatEGP(lecture.price)}</dd>
          </div>
        </div>
      </dl>
    </section>
  );
}
