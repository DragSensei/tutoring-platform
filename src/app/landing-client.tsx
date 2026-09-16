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
  // Live Telemetry Simulation States
  const [motorRpm, setMotorRpm] = React.useState(4850);
  const [gyroAngle, setGyroAngle] = React.useState({ pitch: 2.1, roll: -1.4, yaw: 44.8 });
  const [batteryVoltage, setBatteryVoltage] = React.useState(24.8);
  const [activeTab, setActiveTab] = React.useState<'telemetry' | 'calculator'>('telemetry');
  const [calcSessions, setCalcSessions] = React.useState({ privateCount: 2, groupCount: 4 });

  // Simulate subtle real-time telemetry fluctuations
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMotorRpm((prev) => Math.min(5200, Math.max(4600, prev + (Math.floor(Math.random() * 81) - 40))));
      setBatteryVoltage((prev) => +(Math.max(22.2, prev - 0.01 + (Math.random() * 0.015 - 0.007))).toFixed(2));
      setGyroAngle({
        pitch: +(2.1 + (Math.random() * 0.6 - 0.3)).toFixed(1),
        roll: +(-1.4 + (Math.random() * 0.4 - 0.2)).toFixed(1),
        yaw: +(44.8 + (Math.random() * 0.8 - 0.4)).toFixed(1),
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const totalCalculated = calcSessions.privateCount * 500 + calcSessions.groupCount * 375;

  return (
    <div className="space-y-20">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 pb-12 overflow-hidden">
        {/* Subtle decorative grid background */}
        <div className="absolute inset-0 bg-carbon-grid opacity-30 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-red-600/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative z-10 max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Column: Headline & Heroic Statement */}
          <div className="lg:col-span-7 space-y-6">
            {/* System Status Telemetry Chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#1c1b1d] border border-red-900/40 text-xs font-mono text-red-300">
              <span className="w-2 h-2 rounded-full bg-red-500 led-crimson" />
              <span className="font-semibold text-white">[SYS.MISSION_READY]</span>
              <span className="text-slate-600">::</span>
              <span className="text-slate-300">KINETIC HEROIC ROBOTICS &bull; V1.4</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              IGNITING HEROIC <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-rose-300">
                INVENTORS & ROBOTICISTS.
              </span>
            </h1>

            <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
              Flight-grade STEM, mechanical kinematics, and C++/ROS2 tutoring platform.
              Equipped with automated <span className="text-slate-200 font-medium">Gadwal timetables</span>,
              strict <span className="text-slate-200 font-medium">4-hour check-in verification</span>,
              and frictionless <span className="text-slate-200 font-medium">overdraft student wallets</span>.
            </p>

            {/* Action CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/admin/gadwal">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded bg-[#dc2626] hover:bg-[#ef4444] text-white font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2"
                >
                  <span>⚡</span> EXPLORE GADWAL TIMETABLE
                </motion.button>
              </Link>

              <Link href="/student/wallet">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded bg-[#16171b] hover:bg-[#202127] text-white font-mono font-medium text-sm border border-[#475569] hover:border-[#cbd5e1] transition-all flex items-center gap-2"
                >
                  <span>💳</span> STUDENT WALLET & LEDGER
                </motion.button>
              </Link>

              <Link href="/tutor/agenda">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-3 rounded text-slate-400 hover:text-white font-mono text-xs hover:underline transition-all flex items-center gap-1.5"
                >
                  <span>[SYS.TUTOR_PORTAL]</span> &rarr;
                </motion.button>
              </Link>
            </div>

            {/* Live Metrics Grid */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-[#22242b] max-w-xl">
              <div>
                <div className="font-mono text-2xl font-bold text-white">
                  {stats.activeSessionsCount}
                </div>
                <div className="font-mono text-xs text-slate-500 uppercase tracking-wider">
                  Active Sessions
                </div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-red-400">
                  {stats.totalStudentsCount}
                </div>
                <div className="font-mono text-xs text-slate-500 uppercase tracking-wider">
                  Enrolled Cadets
                </div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-slate-200">
                  4h 00m
                </div>
                <div className="font-mono text-xs text-slate-500 uppercase tracking-wider">
                  Check-in Limit
                </div>
              </div>
            </div>
          </div>

          {/* Hero Right Column: Live Robotics Telemetry Deck (Flight Terminal Sidecar) */}
          <div className="lg:col-span-5">
            <div className="relative rounded-lg bg-[#121316] border border-[#22242b] p-6 shadow-2xl hover:border-red-600/40 hover:shadow-[0_0_24px_-4px_rgba(220,38,38,0.25)] transition-all">
              {/* Mechanical Ribbon Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#22242b]">
                <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 led-emerald" />
                  <span className="font-semibold text-white">[FLIGHT_TERMINAL_V4]</span>
                </div>
                <span className="font-mono text-[10px] text-red-400 bg-red-950/40 border border-red-900/30 px-2 py-0.5 rounded">
                  ROBOTICS TELEMETRY
                </span>
              </div>

              {/* Sub-tabs for Telemetry vs Calculator */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setActiveTab('telemetry')}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-mono font-medium transition-colors ${
                    activeTab === 'telemetry'
                      ? 'bg-red-600/20 text-red-300 border border-red-500/40'
                      : 'bg-[#1c1b1d] text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  LIVE SENSORS
                </button>
                <button
                  onClick={() => setActiveTab('calculator')}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-mono font-medium transition-colors ${
                    activeTab === 'calculator'
                      ? 'bg-red-600/20 text-red-300 border border-red-500/40'
                      : 'bg-[#1c1b1d] text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  MISSION COST ESTIMATOR
                </button>
              </div>

              {activeTab === 'telemetry' ? (
                <div className="space-y-4 font-mono">
                  {/* Motor RPM Gauge */}
                  <div className="bg-[#0e0f12] p-3.5 rounded border border-[#1f2026]">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-400">DRIVE ACTUATOR // MOTOR 01</span>
                      <span className="text-red-400 font-bold">{motorRpm} RPM</span>
                    </div>
                    {/* Segmented Progress Cells */}
                    <div className="grid grid-cols-12 gap-1 h-2">
                      {Array.from({ length: 12 }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`rounded-sm transition-colors duration-300 ${
                            idx < Math.round((motorRpm / 5500) * 12)
                              ? 'bg-red-500'
                              : 'bg-[#1c1d22]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Gyro & Bus Voltage Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0e0f12] p-3 rounded border border-[#1f2026]">
                      <span className="text-[11px] text-slate-400 block mb-1">GYRO SENSOR (IMU)</span>
                      <div className="text-xs space-y-0.5 text-slate-300">
                        <div>P: <span className="text-white font-bold">{gyroAngle.pitch}°</span></div>
                        <div>R: <span className="text-white font-bold">{gyroAngle.roll}°</span></div>
                        <div>Y: <span className="text-white font-bold">{gyroAngle.yaw}°</span></div>
                      </div>
                    </div>

                    <div className="bg-[#0e0f12] p-3 rounded border border-[#1f2026]">
                      <span className="text-[11px] text-slate-400 block mb-1">MAIN BUS VOLTAGE</span>
                      <div className="text-xl font-bold text-emerald-400">{batteryVoltage}V</div>
                      <span className="text-[10px] text-slate-500 block mt-1">6S LiPo Pack (92%)</span>
                    </div>
                  </div>

                  {/* 4-Hour Check-in Rule Telemetry */}
                  <div className="p-3 bg-red-950/20 border border-red-800/30 rounded flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="text-white font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        CHECK-IN PROTOCOL
                      </div>
                      <div className="text-[11px] text-slate-400">Strict start_time + 4 hours limit</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[11px]">
                        HTTP 403 LOCK
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 font-mono">
                  <div className="bg-[#0e0f12] p-3.5 rounded border border-[#1f2026] space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Private Missions (@ 500 EGP)</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCalcSessions((p) => ({ ...p, privateCount: Math.max(0, p.privateCount - 1) }))}
                          className="w-6 h-6 rounded bg-[#1c1d22] text-white hover:bg-slate-700"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold">{calcSessions.privateCount}</span>
                        <button
                          onClick={() => setCalcSessions((p) => ({ ...p, privateCount: p.privateCount + 1 }))}
                          className="w-6 h-6 rounded bg-[#1c1d22] text-white hover:bg-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Group Workshops (@ 375 EGP)</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCalcSessions((p) => ({ ...p, groupCount: Math.max(0, p.groupCount - 1) }))}
                          className="w-6 h-6 rounded bg-[#1c1d22] text-white hover:bg-slate-700"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold">{calcSessions.groupCount}</span>
                        <button
                          onClick={() => setCalcSessions((p) => ({ ...p, groupCount: p.groupCount + 1 }))}
                          className="w-6 h-6 rounded bg-[#1c1d22] text-white hover:bg-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#16171b] border border-[#22242b] rounded flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">ESTIMATED WALLET DEDUCTION</span>
                      <span className="text-2xl font-bold text-red-400 font-mono">
                        {formatEGP(totalCalculated)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 max-w-[130px] text-right">
                      Supports negative overdraft credit balance
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. CORE ARCHITECTURAL MODULES (4 TIERS) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#22242b] pb-4">
          <div>
            <div className="font-mono text-xs text-red-400 font-semibold uppercase tracking-wider mb-1">
              [SYS.SPECS] FLIGHT-GRADE CAPABILITIES
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Mission Control Infrastructure
            </h2>
          </div>
          <span className="font-mono text-xs text-slate-500">
            Unidirectional Feature-Driven Architecture
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="group rounded-lg bg-[#121316] border border-[#22242b] p-6 hover:border-red-600/50 hover:shadow-[0_0_24px_-4px_rgba(220,38,38,0.25)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-slate-500">[SYS.MOD_01]</span>
              <span className="w-2 h-2 rounded-full bg-red-500 led-crimson" />
            </div>
            <div className="text-2xl mb-3">📅</div>
            <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
              Gadwal Timetable
            </h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Schedule Private (500.00 EGP) and Group (375.00 EGP) robotics workshops.
              System strictly computes deadlines at <code className="text-red-300 font-mono text-xs">start_time + 4h</code>.
            </p>
            <div className="mt-4 pt-4 border-t border-[#1c1d22]">
              <Link
                href="/admin/gadwal"
                className="font-mono text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                OPEN GADWAL &rarr;
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group rounded-lg bg-[#121316] border border-[#22242b] p-6 hover:border-red-600/50 hover:shadow-[0_0_24px_-4px_rgba(220,38,38,0.25)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-slate-500">[SYS.MOD_02]</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 led-emerald" />
            </div>
            <div className="text-2xl mb-3">⚡</div>
            <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
              Atomic 4h Check-In
            </h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              One-click self-service check-in via UUID tokens. Executes inside an isolated
              <code className="text-red-300 font-mono text-xs">prisma.$transaction()</code> to verify, deduct, and log.
            </p>
            <div className="mt-4 pt-4 border-t border-[#1c1d22]">
              <Link
                href={`/attend/${sampleTokens.activeGroup}`}
                className="font-mono text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                TEST TOKEN CHECK-IN &rarr;
              </Link>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group rounded-lg bg-[#121316] border border-[#22242b] p-6 hover:border-red-600/50 hover:shadow-[0_0_24px_-4px_rgba(220,38,38,0.25)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-slate-500">[SYS.MOD_03]</span>
              <span className="w-2 h-2 rounded-full bg-red-500 led-crimson" />
            </div>
            <div className="text-2xl mb-3">💳</div>
            <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
              Overdraft Wallet Ledger
            </h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Animated live balance counters powered by motion.dev. Allows post-paid credit
              balances and automatically flags overdraft accounts for admin review.
            </p>
            <div className="mt-4 pt-4 border-t border-[#1c1d22]">
              <Link
                href="/student/wallet"
                className="font-mono text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                VIEW STUDENT WALLET &rarr;
              </Link>
            </div>
          </div>

          {/* Card 4 */}
          <div className="group rounded-lg bg-[#121316] border border-[#22242b] p-6 hover:border-red-600/50 hover:shadow-[0_0_24px_-4px_rgba(220,38,38,0.25)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-slate-500">[SYS.MOD_04]</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 led-emerald" />
            </div>
            <div className="text-2xl mb-3">👨‍🏫</div>
            <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
              Tutor Abstraction
            </h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Zero manual roster check-in duties. Tutors only access clean session agendas,
              copyable token links, and real-time monthly/lifetime volume KPIs.
            </p>
            <div className="mt-4 pt-4 border-t border-[#1c1d22]">
              <Link
                href="/tutor/agenda"
                className="font-mono text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                TUTOR TELEMETRY &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE TOKEN CHECK-IN SIMULATOR TERMINAL */}
      <section className="rounded-lg bg-[#0e0e10] border border-[#22242b] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c1d22] pb-4">
          <div>
            <span className="font-mono text-xs text-red-400 font-semibold uppercase tracking-wider block">
              [TEST_HARNESS] DEMO VERIFICATION
            </span>
            <h3 className="text-2xl font-bold text-white mt-1">
              Live Token Sandbox & Expiration Sentinel
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400 px-3 py-1 bg-[#16171b] border border-slate-800 rounded">
            PRISMA POOLED NEON &bull; LOCAL POSTGRES 18
          </span>
        </div>

        <p className="text-sm text-slate-400">
          Try the active and expired session tokens pre-seeded in the local database to observe 
          the strict 4-hour window validation and automatic HTTP 403 enforcement:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Active Group Token */}
          <div className="p-4 rounded bg-[#131315] border border-emerald-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-emerald-400 font-bold">[ACTIVE &bull; GROUP]</span>
              <span className="text-xs font-mono text-slate-400">375.00 EGP</span>
            </div>
            <div className="text-sm font-semibold text-white">Calculus III & Kinematics</div>
            <div className="font-mono text-[11px] text-slate-500 truncate">
              Token: {sampleTokens.activeGroup}
            </div>
            <Link href={`/attend/${sampleTokens.activeGroup}`} className="block">
              <button className="w-full py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-semibold transition-colors">
                Launch Check-In &rarr;
              </button>
            </Link>
          </div>

          {/* Active Private Token */}
          <div className="p-4 rounded bg-[#131315] border border-indigo-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-indigo-400 font-bold">[ACTIVE &bull; PRIVATE]</span>
              <span className="text-xs font-mono text-slate-400">500.00 EGP</span>
            </div>
            <div className="text-sm font-semibold text-white">Advanced Physics: EM Fields</div>
            <div className="font-mono text-[11px] text-slate-500 truncate">
              Token: {sampleTokens.activePrivate}
            </div>
            <Link href={`/attend/${sampleTokens.activePrivate}`} className="block">
              <button className="w-full py-2 rounded bg-indigo-700 hover:bg-indigo-600 text-white font-mono text-xs font-semibold transition-colors">
                Launch Check-In &rarr;
              </button>
            </Link>
          </div>

          {/* Expired Token */}
          <div className="p-4 rounded bg-[#131315] border border-rose-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-rose-400 font-bold">[EXPIRED &bull; 403 GUARD]</span>
              <span className="text-xs font-mono text-rose-500">WINDOW PASSED</span>
            </div>
            <div className="text-sm font-semibold text-white">Reaction Mechanisms (Archived)</div>
            <div className="font-mono text-[11px] text-slate-500 truncate">
              Token: {sampleTokens.expired}
            </div>
            <Link href={`/attend/${sampleTokens.expired}`} className="block">
              <button className="w-full py-2 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-mono text-xs font-semibold transition-colors">
                Verify 403 Block &rarr;
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. ROBOTICS & STEM CURRICULUM SQUADRONS */}
      <section className="space-y-6">
        <div className="border-b border-[#22242b] pb-4">
          <span className="font-mono text-xs text-red-400 font-semibold uppercase tracking-wider block">
            [CURRICULUM.LEVELS]
          </span>
          <h3 className="text-3xl font-bold text-white mt-1">
            Engineering & Competitive Tracks
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg bg-[#121316] border border-[#22242b] p-6 space-y-4">
            <div className="text-xs font-mono text-red-400 font-bold">[LEVEL_01] CHASSIS & SENSORS</div>
            <h4 className="text-xl font-bold text-white">Autonomous Line Cadets</h4>
            <p className="text-sm text-slate-400">
              Fundamental embedded programming with C++ and Arduino microcontrollers. PID speed control and optical infrared sensor tuning.
            </p>
            <div className="font-mono text-xs text-slate-500">Group: 375 EGP / Private: 500 EGP</div>
          </div>

          <div className="rounded-lg bg-[#121316] border border-[#22242b] p-6 space-y-4">
            <div className="text-xs font-mono text-red-400 font-bold">[LEVEL_02] MECHATRONICS</div>
            <h4 className="text-xl font-bold text-white">BattleBot & Heavy Kinetics</h4>
            <p className="text-sm text-slate-400">
              High-torque brushless DC motor control, ESC telemetry, gear ratios, and radio telemetry receivers for combat robotics.
            </p>
            <div className="font-mono text-xs text-slate-500">Group: 375 EGP / Private: 500 EGP</div>
          </div>

          <div className="rounded-lg bg-[#121316] border border-[#22242b] p-6 space-y-4">
            <div className="text-xs font-mono text-red-400 font-bold">[LEVEL_03] ROS2 & VISION</div>
            <h4 className="text-xl font-bold text-white">Autonomous Mobile Rovers</h4>
            <p className="text-sm text-slate-400">
              Edge computing on Raspberry Pi & NVIDIA Jetson, Python, OpenCV camera tracking, SLAM lidar navigation, and node architectures.
            </p>
            <div className="font-mono text-xs text-slate-500">Group: 375 EGP / Private: 500 EGP</div>
          </div>
        </div>
      </section>
    </div>
  );
}
