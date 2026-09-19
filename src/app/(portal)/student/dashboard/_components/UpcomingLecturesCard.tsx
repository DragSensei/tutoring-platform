import React from 'react';
import { Calendar, User, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '_vault/ui/feedback/empty-state';
import { formatEGP } from '@/shared/utils/currency';
import { formatSessionSchedule } from '@/shared/utils/date-format';

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

interface UpcomingLecturesCardProps {
  lecture: ScheduledLecture | null;
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
    <div className="rounded-xl border border-stone-200/90 bg-white p-6 shadow-[0_1px_2px_rgba(25,24,23,0.04)] border-l-4 border-l-brand-primary">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-brand-subtle border border-brand-border/60 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-primary">
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

        {lecture.isAttended ? (
          <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-800 sm:self-start">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Attendance Recorded by Tutor</span>
          </div>
        ) : lecture.isWithinActiveWindow ? (
          <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs font-semibold text-amber-800 sm:self-start">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>Session Active &bull; Tutor Recording Attendance</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-lg bg-stone-50 border border-stone-200 px-4 py-2.5 text-xs font-medium text-stone-600 sm:self-start">
            <ShieldCheck className="h-4 w-4 text-stone-400" />
            <span>Attendance Recorded by Tutor in Class</span>
          </div>
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
              {formatSessionSchedule(lecture.startTime)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 sm:justify-end">
          <Calendar className="mt-0.5 h-4 w-4 text-stone-400" />
          <div className="sm:text-right">
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
              Session Fee
            </p>
            <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-brand-primary">
              {formatEGP(lecture.price)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
