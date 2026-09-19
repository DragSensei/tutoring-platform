'use client';

import * as React from 'react';
import Link from 'next/link';
import { Users, Mail, Phone, CalendarDays, ArrowRight } from 'lucide-react';

export interface MentorItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  sessionsCount: number;
}

interface AdminMentorsViewProps {
  mentors: MentorItem[];
}

export function AdminMentorsView({ mentors }: AdminMentorsViewProps) {
  return (
    <div className="space-y-8">
      {/* Header aligned with Admin baseline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-brand-subtle border border-brand-border/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-primary">
              Admin Console
            </span>
            <span className="text-xs font-semibold text-stone-500">Academic Staff</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mt-1">
            Faculty Mentors (هيئة التدريس)
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Review certified robotics instructors, assigned teaching cohorts, and timetable pacing.
          </p>
        </div>

        <Link
          href="/admin/gadwal"
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-primary hover:bg-brand-hover text-white shadow-xs transition-all active:scale-98 self-start sm:self-auto"
        >
          <CalendarDays className="h-4 w-4" />
          <span>Assign to Gadwal</span>
        </Link>
      </div>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mentors.map((mentor) => (
          <div
            key={mentor.id}
            className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 font-bold text-base">
                  {mentor.name.slice(0, 1)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">{mentor.name}</h2>
                  <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md mt-0.5">
                    Active Faculty
                  </span>
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-xs text-stone-400 block uppercase tracking-wider">Cohorts</span>
                <span className="text-lg font-bold text-stone-800">{mentor.sessionsCount}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-stone-100 text-xs text-stone-600">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-stone-400" />
                <span>{mentor.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-stone-400" />
                <span className="font-mono">{mentor.phone}</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={`/admin/gadwal?tutorId=${mentor.id}`}
                className="min-h-[44px] w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              >
                <span>View Mentor Sessions</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
