'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { cancelAdminSession, deleteAdminSession } from '../actions';
import {
  GadwalTable,
  type GadwalSessionItem,
} from '@/features/sessions/components/gadwal-table';

interface AdminGadwalViewProps {
  sessions: GadwalSessionItem[];
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

export function AdminGadwalView({ sessions }: AdminGadwalViewProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 w-full min-w-0"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 border-b border-stone-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between"
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
          <p className="text-xs sm:text-sm text-stone-500 mt-1 line-clamp-2">
            Schedule private and group tutoring sessions with policy-controlled pricing and persisted rosters.
          </p>
        </div>
        <Link href="/admin/gadwal/new" className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Session
        </Link>
      </motion.div>

      <motion.div variants={itemVariants}>
        <GadwalTable sessions={sessions} showAdminActions onDeleteSession={deleteAdminSession} onCancelSession={cancelAdminSession} />
      </motion.div>
    </motion.div>
  );
}
