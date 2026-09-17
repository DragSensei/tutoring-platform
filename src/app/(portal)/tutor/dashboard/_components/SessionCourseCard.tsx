'use client';

import * as React from 'react';
import { Users, Calendar, ArrowRight, CheckCircle } from 'lucide-react';
import { formatDateTime } from '@/shared/utils/date-format';
import { CopyTokenButton } from '@/features/sessions/components/copy-token-button';
import type { GadwalSessionItem } from '@/features/sessions/types';

interface SessionCourseCardProps {
  session: GadwalSessionItem;
  isSelected?: boolean;
  onSelect?: (session: GadwalSessionItem) => void;
}

export function SessionCourseCard({
  session,
  isSelected = false,
  onSelect,
}: SessionCourseCardProps) {
  const isGroup = session.sessionType === 'GROUP';
  const isActive = session.status === 'ACTIVE';

  return (
    <div
      onClick={() => onSelect?.(session)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(session);
        }
      }}
      className={`group relative flex flex-col justify-between rounded-xl border p-6 text-left transition-all cursor-pointer ${
        isSelected
          ? 'border-red-600 bg-white shadow-md ring-2 ring-red-600/20'
          : 'border-stone-200 bg-white shadow-sm hover:border-stone-300 hover:shadow-md'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
            {session.sessionType}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'bg-stone-50 text-stone-600'
            }`}
          >
            {session.status}
          </span>
        </div>

        {/* Course Title (Strictly NO pictures per specification) */}
        <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-red-700 transition-colors line-clamp-2">
          {session.title}
        </h3>

        {/* Number of Students in the Course */}
        <div className="mt-5 rounded-lg bg-stone-50 p-3.5 border border-stone-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-600">
              <Users className="h-4 w-4 text-stone-400" />
              <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
                Enrolled Students
              </span>
            </div>
            <span className="text-xs text-stone-400">
              {isGroup ? 'Group Cap: 4' : 'Private (1-on-1)'}
            </span>
          </div>

          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-stone-900 tabular-nums">
              {session.attendeeCount}
            </span>
            <span className="text-xs font-medium text-stone-500">
              {session.attendeeCount === 1 ? 'student present' : 'students present'}
            </span>
          </div>
        </div>

        {/* Schedule Timing Info */}
        <div className="mt-4 flex items-center gap-2 text-xs text-stone-500">
          <Calendar className="h-3.5 w-3.5 text-stone-400" />
          <span>{formatDateTime(session.startTime)}</span>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
        <div onClick={(e) => e.stopPropagation()}>
          <CopyTokenButton token={session.token} />
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 group-hover:text-red-600 transition-colors">
          {isSelected ? (
            <span className="inline-flex items-center gap-1 text-red-600">
              <CheckCircle className="h-3.5 w-3.5" />
              Selected
            </span>
          ) : (
            <>
              <span>Select Session</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </span>
      </div>
    </div>
  );
}
