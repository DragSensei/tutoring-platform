'use client';

import * as React from 'react';
import { Users, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatDateTime } from '@/shared/utils/date-format';
import { formatSessionCode } from '@/shared/utils/session-code';
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

  // Format code like ON-P3-6:00-8:00
  const sessionCode =
    session.sessionCode ||
    formatSessionCode({
      title: session.title,
      startTime: session.startTime,
      endTime: session.endTime,
    });

  const studentsList = session.assignedStudents || [];

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
      className={`group relative flex flex-col justify-between rounded-xl border p-5 sm:p-6 text-left transition-all cursor-pointer ${
        isSelected
          ? 'border-brand-primary bg-white shadow-md ring-2 ring-brand-primary/20 scale-[1.01]'
          : 'border-stone-200 bg-white shadow-xs hover:border-brand-border hover:shadow-sm hover:scale-[1.005]'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
            {session.sessionType}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-stone-50 text-stone-600 border border-stone-200'
            }`}
          >
            {session.status}
          </span>
        </div>

        {/* Name of Session (e.g., ON-P3-6:00-8:00) */}
        <div className="space-y-1">
          <h3 className="font-mono text-xl font-extrabold tracking-tight text-stone-900 group-hover:text-brand-primary transition-colors">
            {sessionCode}
          </h3>
          <p className="text-xs sm:text-sm font-medium text-stone-600 line-clamp-1">
            {session.title}
          </p>
        </div>

        {/* Text of Assigned Students */}
        <div className="mt-5 rounded-lg bg-stone-50/90 p-3.5 border border-stone-100/90">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-stone-600">
              <Users className="h-3.5 w-3.5 text-stone-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Assigned Students ({studentsList.length})
              </span>
            </div>
            <span className="text-[10px] text-stone-400 font-medium">
              {isGroup ? 'Group Cap: 4' : 'Private (1-on-1)'}
            </span>
          </div>

          <p className="mt-2 text-xs sm:text-sm font-semibold text-stone-800 leading-relaxed">
            {studentsList.length > 0 ? (
              studentsList.join(', ')
            ) : (
              <span className="text-stone-400 font-normal italic">
                No students assigned to this cohort yet
              </span>
            )}
          </p>
        </div>

        {/* Schedule Timing Info */}
        <div className="mt-4 flex items-center gap-2 text-xs text-stone-500">
          <Calendar className="h-3.5 w-3.5 text-stone-400" />
          <span>{formatDateTime(session.startTime)}</span>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-end">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 group-hover:text-red-600 transition-colors">
          {isSelected ? (
            <span className="inline-flex items-center gap-1 text-red-600 font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
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
