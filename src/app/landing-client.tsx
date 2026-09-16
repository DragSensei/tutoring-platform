'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { formatEGP } from '@/shared/utils/currency';

interface LandingClientProps {
  stats: {
    activeSessionsCount: number;
    totalStudentsCount: number;
    activeTutorsCount: number;
  };
  sampleTokens: {
    activePrivate: string;
    activeGroup: string;
    expired: string;
  };
}

export function LandingClient({ stats, sampleTokens }: LandingClientProps) {
  const [selectedPlan, setSelectedPlan] = React.useState<'GROUP' | 'PRIVATE'>('GROUP');

  return (
    <div className="space-y-16 pb-12">
      {/* 1. WELCOMING HERO SECTION */}
      <section className="relative pt-6 pb-12 text-center max-w-4xl mx-auto space-y-6">
        {/* Friendly Top Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-semibold text-red-700 shadow-sm">
          <span>🚀</span>
          <span>Hands-on STEM & Robotics Academy for Kids & Teens</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Inspiring Young Minds to{' '}
          <span className="text-red-600 underline decoration-red-200 decoration-wavy decoration-2">
            Code, Build & Innovate.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Interactive robotics, coding, and electronics tutoring designed for young creators.
          Clear weekly timetables, flexible family wallets, and inspiring mentors.
        </p>

        {/* Primary Call-to-Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link href="/admin/gadwal" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>📅</span> Browse Class Schedule
            </motion.button>
          </Link>

          <Link href="/student/wallet" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-base border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>💳</span> View Student Wallet
            </motion.button>
          </Link>
        </div>

        {/* Friendly Trust Reassurance Highlights */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Small Groups (3–5 Students)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Flexible Wallet & Overdraft Credit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>1-Click Link Check-in</span>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS: 3 SIMPLE STEPS */}
      <section className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            How It Works for Families
          </h2>
          <p className="text-slate-500 text-sm">
            Getting your child started with robotics is simple, transparent, and completely hassle-free.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-2xl shadow-sm">
              🗓️
            </div>
            <div className="text-xs font-bold text-red-600 uppercase tracking-wider">Step 1</div>
            <h3 className="text-lg font-bold text-slate-900">Pick a Convenient Session</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Check our live Gadwal timetable. Choose between dedicated 1-on-1 private lessons or interactive group squads.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl shadow-sm">
              🔗
            </div>
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Step 2</div>
            <h3 className="text-lg font-bold text-slate-900">One-Tap Check-In Link</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              No complicated apps or paper sign-in sheets. The tutor shares a secure link. Your child taps once to confirm attendance within 4 hours.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl shadow-sm">
              💳
            </div>
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step 3</div>
            <h3 className="text-lg font-bold text-slate-900">Clear Wallet Ledger</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Session costs deduct automatically upon check-in. Parents enjoy full receipt transparency and credit overdraft protection.
            </p>
          </div>
        </div>
      </section>

      {/* 3. TRANSPARENT PRICING & SESSION TYPES */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Simple, Transparent Session Rates
          </h2>
          <p className="text-slate-500 text-sm">
            Pay per session with your family wallet. No hidden fees or surprise long-term lock-ins.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Group Workshop Card */}
          <div
            onClick={() => setSelectedPlan('GROUP')}
            className={`cursor-pointer rounded-2xl p-8 border-2 transition-all bg-white shadow-sm hover:shadow-md ${
              selectedPlan === 'GROUP'
                ? 'border-red-500 ring-2 ring-red-500/10'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                Most Popular for Friends
              </span>
              <span className="text-2xl">👥</span>
            </div>

            <h3 className="text-2xl font-bold text-slate-900">Group Workshop</h3>
            <p className="text-sm text-slate-500 mt-1">
              Fun, collaborative STEM & robotics missions with 3 to 5 fellow students.
            </p>

            <div className="my-6 pb-6 border-b border-slate-100">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 font-mono">
                  {formatEGP(375)}
                </span>
                <span className="text-sm text-slate-500 font-medium">/ 2-hr session</span>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-slate-600 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Hands-on team robotics building
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Friendly coding mini-challenges
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Hardware & kits provided in workshop
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Automated 4h attendance link
              </li>
            </ul>

            <Link href="/admin/gadwal" className="block">
              <button className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors">
                View Group Schedule
              </button>
            </Link>
          </div>

          {/* Private 1-on-1 Card */}
          <div
            onClick={() => setSelectedPlan('PRIVATE')}
            className={`cursor-pointer rounded-2xl p-8 border-2 transition-all bg-white shadow-sm hover:shadow-md ${
              selectedPlan === 'PRIVATE'
                ? 'border-red-500 ring-2 ring-red-500/10'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                1-on-1 Personalized
              </span>
              <span className="text-2xl">⭐</span>
            </div>

            <h3 className="text-2xl font-bold text-slate-900">Private Mentorship</h3>
            <p className="text-sm text-slate-500 mt-1">
              Dedicated 1-on-1 focus tailored specifically to your child’s speed and interests.
            </p>

            <div className="my-6 pb-6 border-b border-slate-100">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-red-600 font-mono">
                  {formatEGP(500)}
                </span>
                <span className="text-sm text-slate-500 font-medium">/ 2-hr session</span>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-slate-600 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Dedicated mentor for your child
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Custom curriculum & project choice
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Direct parent progress updates
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Flexible rescheduling with 4h window
              </li>
            </ul>

            <Link href="/admin/gadwal" className="block">
              <button className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-colors">
                Book Private Session
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. LEARNING TRACKS BY AGE (VISUAL & SIMPLE) */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Programs Tailored for Every Age
          </h2>
          <p className="text-slate-500 text-sm">
            From first robotics kits to advanced engineering rovers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Level 1 */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl font-bold">
              🐣
            </div>
            <div>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Ages 8 to 11
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">Junior Inventor</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Kids learn how motors, batteries, and sensors connect. Fun visual block coding brings interactive creations to life.
            </p>
            <div className="pt-2 text-xs font-semibold text-slate-500">
              Skills: Visual Coding &bull; Circuits &bull; Creative Problem Solving
            </div>
          </div>

          {/* Level 2 */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-2xl font-bold">
              🤖
            </div>
            <div>
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                Ages 12 to 14
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">Robotics Cadet</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Hands-on Arduino microcontrollers, line-following sensors, and motor speed controllers. Real engineering thinking!
            </p>
            <div className="pt-2 text-xs font-semibold text-slate-500">
              Skills: Arduino &bull; C++ Basics &bull; Mechanical Chassis Assembly
            </div>
          </div>

          {/* Level 3 */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl font-bold">
              🚀
            </div>
            <div>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                Ages 15 and up
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">Future Engineer</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Autonomous mobile rovers, camera obstacle avoidance with Python, ROS2 architecture, and robotics competitions.
            </p>
            <div className="pt-2 text-xs font-semibold text-slate-500">
              Skills: Python & ROS2 &bull; Computer Vision &bull; Competition Prep
            </div>
          </div>
        </div>
      </section>

      {/* 5. TRY ATTENDANCE: SIMPLE DEMO BOX */}
      <section className="bg-slate-100/80 rounded-2xl p-6 sm:p-8 border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider block">
              Quick Test Drive
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              See How Effortless Check-In Is for Students
            </h3>
          </div>
          <span className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
            ⏱️ Guaranteed 4-Hour Safety Window
          </span>
        </div>

        <p className="text-sm text-slate-600 max-w-2xl">
          When class starts, the tutor simply shares a link with the class. Try clicking one of our pre-scheduled sessions below to see the instant verification screen:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Active Group Session Demo */}
          <Link
            href={`/attend/${sampleTokens.activeGroup}`}
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-red-400 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Active Group (375 EGP)
                </span>
                <span className="text-xs text-slate-400">Class in session</span>
              </div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                Calculus & Kinematics Workshop
              </div>
            </div>
            <span className="text-sm font-semibold text-red-600 group-hover:translate-x-1 transition-transform">
              Try Check-in &rarr;
            </span>
          </Link>

          {/* Active Private Session Demo */}
          <Link
            href={`/attend/${sampleTokens.activePrivate}`}
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-red-400 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Active Private (500 EGP)
                </span>
                <span className="text-xs text-slate-400">1-on-1</span>
              </div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                Advanced Physics & Robotics Lab
              </div>
            </div>
            <span className="text-sm font-semibold text-red-600 group-hover:translate-x-1 transition-transform">
              Try Check-in &rarr;
            </span>
          </Link>
        </div>
      </section>

      {/* 6. PARENT FAQS (REASSURING & DIRECT) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
        <h3 className="text-xl font-bold text-slate-900">Frequently Asked Questions for Parents</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <span>❓</span> What happens if our wallet balance runs out?
            </h4>
            <p className="text-slate-600 leading-relaxed">
              We never stop your child from learning. Our system permits post-paid overdraft balances so your child can attend their scheduled class uninterrupted. You can top up anytime via the parent portal.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <span>❓</span> Do parents or kids need to install any app?
            </h4>
            <p className="text-slate-600 leading-relaxed">
              No apps required! The platform works directly in your web browser on iPhones, Android devices, iPads, and computers.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <span>❓</span> What is the 4-hour check-in window?
            </h4>
            <p className="text-slate-600 leading-relaxed">
              To prevent accidental deductions and billing errors, attendance links are only valid for 4 hours from the class start time. This guarantees you are only charged when your child is present.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <span>❓</span> Who teaches the classes?
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Every mentor is a vetted engineering instructor specialized in robotics, electronics, and software development, trained to make complex concepts fun and approachable for kids.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
