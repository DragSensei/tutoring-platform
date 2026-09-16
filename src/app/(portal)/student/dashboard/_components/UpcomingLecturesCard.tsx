import React from 'react';
import Link from 'next/link';
import { Calendar, User, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { EmptyState } from '_vault/ui/feedback/empty-state';
import { formatEGP } from '@/shared/utils/currency';

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
}

interface UpcomingLecturesCardProps {
  lecture: ScheduledLecture | null;
}

function formatDeterministicSchedule(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Time unconfirmed';

  const cairoFormatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  const utcFormatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  return `${cairoFormatted} Cairo (${utcFormatted} UTC)`;
}

export function UpcomingLecturesCard({ lecture }: UpcomingLecturesCardProps) {
  if (!lecture) {
    return (
      <EmptyState
        title="No Lectures Scheduled"
        description="No lectures or review sessions are scheduled for the current week. Check back later or contact your academy advisor."
      />
    );
  }

  return (
    <div className="rounded-xl border border-stone-200/90 bg-white p-6 shadow-[0_1px_2px_rgba(25,24,23,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-stone-600">
              Next Scheduled Session
            </span>
            <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
              {lecture.sessionType}
            </span>
          </div>
          <h2 className="font-serif text-xl font-medium text-stone-900 sm:text-2xl">
            {lecture.title}
          </h2>
        </div>

        {lecture.isWithinActiveWindow && (
          <Link
            href={`/attend/${lecture.token}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C2410C] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#9A3412] active:scale-95 sm:self-start"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Enter Session Check-In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-stone-100 pt-5 sm:grid-cols-3">
        <div className="flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 text-stone-400" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
              Instructor / Tutor
            </p>
            <p className="mt-0.5 text-sm font-medium text-stone-800">
              {lecture.tutorName}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 text-stone-400" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
              Schedule (Cairo / UTC)
            </p>
            <p className="mt-0.5 text-sm font-medium text-stone-800">
              {formatDeterministicSchedule(lecture.startTime)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 sm:justify-end">
          <Calendar className="mt-0.5 h-4 w-4 text-stone-400" />
          <div className="sm:text-right">
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
              Session Fee
            </p>
            <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-stone-900">
              {formatEGP(lecture.price)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
