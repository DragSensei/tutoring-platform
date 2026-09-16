'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';

interface LandingClientProps {
  sampleToken: string;
}

export function LandingClient({ sampleToken }: LandingClientProps) {
  return (
    <div className="min-h-[calc(100vh-13rem)] flex flex-col justify-center items-center text-center max-w-4xl mx-auto px-4 py-4 space-y-8">
      {/* Friendly Academy Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-semibold text-red-700 shadow-sm"
      >
        <span>🤖</span>
        <span>Hands-on STEM & Robotics Academy for Young Inventors</span>
      </motion.div>

      {/* Main Title & Friendly Subtitle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="space-y-4"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Inspiring Young Minds to{' '}
          <span className="text-red-600">Code, Build & Create.</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Welcome to Kinetic Robotics. A fun, supportive environment where children and teens
          explore robotics, electronics, and coding through interactive hands-on mentorship.
        </p>
      </motion.div>

      {/* Two Primary Action Buttons */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md mx-auto"
      >
        <Link href="/admin/gadwal" className="w-full sm:w-auto flex-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2"
          >
            <span>📅</span> View Class Schedule
          </motion.button>
        </Link>

        <Link href="/student/wallet" className="w-full sm:w-auto flex-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-6 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <span>💳</span> Student Wallet
          </motion.button>
        </Link>
      </motion.div>

      {/* 3 Simple Feature Cards (Clean, Short, No Prices, No Courses) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl pt-2"
      >
        <Link
          href="/admin/gadwal"
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-red-300 hover:shadow-sm transition-all text-left space-y-1 group"
        >
          <div className="text-xl">🗓️</div>
          <div className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
            Gadwal Timetable
          </div>
          <p className="text-xs text-slate-500 leading-snug">
            Check weekly session timings and mentor availability.
          </p>
        </Link>

        <Link
          href={`/attend/${sampleToken}`}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-red-300 hover:shadow-sm transition-all text-left space-y-1 group"
        >
          <div className="text-xl">🔗</div>
          <div className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
            One-Tap Check-In
          </div>
          <p className="text-xs text-slate-500 leading-snug">
            Confirm your child’s attendance directly with the tutor link.
          </p>
        </Link>

        <Link
          href="/tutor/agenda"
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-red-300 hover:shadow-sm transition-all text-left space-y-1 group"
        >
          <div className="text-xl">👨‍🏫</div>
          <div className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
            Tutor Agenda
          </div>
          <p className="text-xs text-slate-500 leading-snug">
            Instructor dashboard with copyable links and KPIs.
          </p>
        </Link>
      </motion.div>

      {/* Gentle Bottom Reassurance */}
      <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">✓</span> 4-Hour Attendance Window
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">✓</span> Flexible Family Credit Wallet
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">✓</span> Dedicated Engineering Mentors
        </span>
      </div>
    </div>
  );
}
