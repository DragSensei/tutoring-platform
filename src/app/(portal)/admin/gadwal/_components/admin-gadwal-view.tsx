'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { ScheduleSessionCard } from './schedule-session-card';
import {
  GadwalTable,
  type GadwalSessionItem,
} from '@/features/sessions/components/gadwal-table';

interface AdminGadwalViewProps {
  sessions: GadwalSessionItem[];
  tutors: { id: string; name: string; email: string }[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export function AdminGadwalView({ sessions, tutors }: AdminGadwalViewProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 w-full min-w-0"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5 min-h-[92px]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-brand-subtle border border-brand-border/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-primary">
              Admin Console
            </span>
            <span className="text-xs font-semibold text-stone-500">Timetable & Schedule</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mt-1 truncate">
            Admin Gadwal Management (إدارة الجدول)
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 line-clamp-1">
            Schedule private and group tutoring sessions. Check-in deadlines are strictly set to 4 hours from start time.
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ScheduleSessionCard tutors={tutors} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <GadwalTable sessions={sessions} />
      </motion.div>
    </motion.div>
  );
}
