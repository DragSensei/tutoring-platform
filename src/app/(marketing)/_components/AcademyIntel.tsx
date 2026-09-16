'use client';

import { motion } from 'motion/react';

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function AcademyIntel() {
  return (
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
  );
}
