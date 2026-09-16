'use client';

import { motion } from 'motion/react';
import { Bot, GraduationCap, Lightbulb } from 'lucide-react';

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function PillarsSection() {
  return (
    <motion.section
      variants={itemVariants}
      className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl pt-2"
    >
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-2 hover:border-slate-300 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
          <Bot className="w-5 h-5" strokeWidth={2.2} />
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
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <GraduationCap className="w-5 h-5" strokeWidth={2.2} />
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
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Lightbulb className="w-5 h-5" strokeWidth={2.2} />
        </div>
        <h2 className="text-base font-bold text-slate-900">Creative Confidence</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Transform screen time into productive STEM mastery, problem-solving skills, and teamwork.
        </p>
      </motion.div>
    </motion.section>
  );
}
