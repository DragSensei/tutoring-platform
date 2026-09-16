'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function HeroSection() {
  return (
    <motion.section variants={itemVariants} className="space-y-4 flex flex-col items-center">
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
        Where Young Heroes <br className="hidden sm:inline" />
        <span className="text-red-600">Build Tomorrow’s Technology.</span>
      </h1>

      <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
        Inspiring coding, robotics, and engineering mentorship for children and teens.
        We turn curious minds into confident inventors through hands-on projects and supportive guidance.
      </p>

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
  );
}
