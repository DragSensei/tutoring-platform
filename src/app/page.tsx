'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function HomePage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="min-h-[calc(100vh-12rem)] flex flex-col justify-center items-center text-center max-w-4xl mx-auto px-4 py-4 space-y-8"
    >
      {/* 1. HERO HEADER */}
      <motion.section variants={itemVariants} className="space-y-4 flex flex-col items-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Where Young Heroes <br className="hidden sm:inline" />
          <span className="text-red-600">Build Tomorrow’s Technology.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Inspiring coding, robotics, and engineering mentorship for children and teens.
          We turn curious minds into confident inventors through hands-on projects and supportive guidance.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 w-full">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign In to Academy Portal &rarr;
          </Link>
          <Link
            href="/about"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-300 shadow-sm transition-all"
          >
            About Our Programs
          </Link>
        </div>
      </motion.section>

      {/* 2. THREE PILLARS (WHY PARENTS CHOOSE US) */}
      <motion.section
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl pt-2"
      >
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-2 hover:border-slate-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold">
            🤖
          </div>
          <h2 className="text-base font-bold text-slate-900">Hands-On Building</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Children build real physical robots, write code, and see their creations move and solve challenges.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-2 hover:border-slate-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
            👨‍🏫
          </div>
          <h2 className="text-base font-bold text-slate-900">Expert Mentors</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Passionate engineers who guide and empower each student step-by-step with patience and encouragement.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-2 hover:border-slate-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
            💡
          </div>
          <h2 className="text-base font-bold text-slate-900">Creative Confidence</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Transform screen time into productive STEM mastery, problem-solving skills, and teamwork.
          </p>
        </motion.div>
      </motion.section>

      {/* 3. REASSURING BOTTOM BAR WITH ACADEMY INTEL */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 pt-2"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">✓</span> Ages 6 to 26
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">✓</span> Egyptian Engineers Syndicate Certified
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">✓</span> 20+ Branches Across Egypt
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">✓</span> FLL & VEX Competition Teams
        </span>
      </motion.div>
    </motion.div>
  );
}
