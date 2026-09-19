'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Wallet,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Clock,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { formatDateTime } from '@/shared/utils/date-format';
import { formatEGP } from '@/shared/utils/currency';
import { motion } from 'motion/react';
import type { AdminOverviewData } from './admin-overview-data';

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

export function AdminOverviewView({
  kpis,
  flaggedWallets,
  recentSessions,
}: AdminOverviewData) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Executive Header & Quick Action Bar */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5 min-h-[92px]"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-brand-subtle border border-brand-border/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-primary">
              Executive Console
            </span>
            <span className="text-xs font-semibold text-stone-500">Live Academy Metrics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mt-1">
            Admin Overview (نظرة عامة)
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Monitor STEM cohort schedules, check-in pacing, faculty mentors, and student financial health.
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/gadwal"
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-primary hover:bg-brand-hover text-white shadow-xs transition-all active:scale-98"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Schedule Session</span>
          </Link>

          <Link
            href="/admin/wallets"
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 shadow-xs transition-all active:scale-98"
          >
            <Wallet className="h-4 w-4 text-stone-500" />
            <span>Manage Wallets</span>
          </Link>
        </div>
      </motion.div>

      {/* 4 Core KPI Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Sessions */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Active Cohorts
            </span>
            <div className="h-9 w-9 rounded-xl bg-brand-subtle flex items-center justify-center text-brand-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black tracking-tight text-stone-900 font-mono">
              {kpis.activeSessionsCount}
            </div>
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
              <span>{kpis.completedSessionsCount} past sessions archived</span>
            </p>
          </div>
        </motion.div>

        {/* Card 2: Enrolled Students */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Enrolled Students
            </span>
            <div className="h-9 w-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black tracking-tight text-stone-900 font-mono">
              {kpis.totalStudentsCount}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Active robotics & coding learners
            </p>
          </div>
        </motion.div>

        {/* Card 3: Faculty Mentors */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Faculty Mentors
            </span>
            <div className="h-9 w-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
              <Sparkles className="h-5 w-5 text-brand-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black tracking-tight text-stone-900 font-mono">
              {kpis.totalTutorsCount}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Authorized engineering instructors
            </p>
          </div>
        </motion.div>

        {/* Card 4: Total Check-ins */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Verified Attendances
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black tracking-tight text-stone-900 font-mono">
              {kpis.totalAttendancesCount}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Strict 4h validated records
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Financial Health & Overdraft Sentinel */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                kpis.flaggedOverdraftsCount > 0
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {kpis.flaggedOverdraftsCount > 0 ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Wallet Solvency Sentinel (مراقبة السحب على المكشوف)
              </h2>
              <p className="text-xs text-stone-500">
                Automatic overdraft detection on check-in debit transactions
              </p>
            </div>
          </div>

          <Link
            href="/admin/wallets"
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-brand-primary hover:text-brand-hover hover:bg-brand-subtle transition-colors self-start sm:self-auto"
          >
            <span>Review All Wallets</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {kpis.flaggedOverdraftsCount > 0 ? (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-rose-900">
                  {kpis.flaggedOverdraftsCount} student account(s) currently flagged with negative balances ({formatEGP(kpis.totalNegativeDebtEgp)} total pending debt).
                </p>
              </div>
            </div>

            <div className="divide-y divide-stone-100 border border-stone-200/60 rounded-xl overflow-hidden">
              {flaggedWallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-stone-50/50 hover:bg-stone-50 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-sm text-stone-900">
                      {wallet.studentName}
                    </span>
                    <span className="text-xs text-stone-400 ml-2 font-mono">
                      {wallet.studentPhone} &bull; {wallet.studentEmail}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-rose-600">
                      {formatEGP(wallet.balanceEgp)}
                    </span>
                    <Link
                      href={`/admin/wallets?search=${encodeURIComponent(wallet.studentName)}`}
                      className="min-h-[44px] inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                    >
                      <span>Credit Deposit</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-emerald-900">
              All student wallets are solvent. Zero overdraft debt flagged across active cohorts.
            </p>
          </div>
        )}
      </motion.div>

      {/* Recent Timetable Schedule Overview */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-stone-500" />
            <h2 className="text-base font-bold text-stone-900">Recent Scheduled Sessions</h2>
          </div>

          <Link
            href="/admin/gadwal"
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <span>View Full Gadwal</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-stone-200 rounded-xl">
            <p className="text-sm text-stone-500">No scheduled sessions found in database.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 border border-stone-200/60 rounded-xl overflow-hidden">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-stone-50/50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-stone-900">
                      {session.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        session.sessionType === 'PRIVATE'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {session.sessionType}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        session.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Mentor: <strong className="text-stone-700 font-medium">{session.tutorName}</strong> &bull; Starts: {formatDateTime(session.startTime)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-500">
                    <strong className="font-semibold text-stone-800">{session.attendeeCount}</strong> checked in
                  </span>
                  <Link
                    href={`/admin/gadwal?session=${session.id}`}
                    className="min-h-[44px] inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                  >
                    <span>Manage</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
