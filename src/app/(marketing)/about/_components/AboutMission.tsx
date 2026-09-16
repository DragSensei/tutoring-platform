'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Rocket } from 'lucide-react';

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export function AboutMission() {
  return (
    <>
      <motion.div
        variants={itemVariants}
        className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm text-left space-y-3 text-xs text-slate-600 leading-relaxed"
      >
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Rocket className="w-4 h-4 text-red-600" /> Our Mentorship Philosophy
        </h3>
        <p>
          We bridge theoretical science and tangible invention. Through small collaborative cohorts, each child works directly with accredited engineer-mentors, turning curiosity into real-world code, functioning mechanisms, and creative confidence.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-1 font-semibold text-slate-700">
          <span>✓ Ages 6 to 26</span>
          <span>✓ Hands-On Hardware Kits</span>
          <span>✓ 1-on-1 Engineering Support</span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="pt-2">
        <Link
          href="/"
          className="text-sm font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1.5 transition-colors"
        >
          &larr; Back to Home
        </Link>
      </motion.div>
    </>
  );
}
