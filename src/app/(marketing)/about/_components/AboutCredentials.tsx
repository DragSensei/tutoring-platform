'use client';

import { motion } from 'motion/react';
import { GraduationCap, Trophy, Globe2 } from 'lucide-react';

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export function AboutCredentials() {
  return (
    <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
      <motion.div
        whileHover={{ y: -3 }}
        transition={{ duration: 0.2 }}
        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1.5 hover:border-slate-300 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
          <GraduationCap className="w-4 h-4" strokeWidth={2.2} />
        </div>
        <h2 className="text-sm font-bold text-slate-900">Syndicate Certified</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Accredited by Egyptian Engineers Syndicate. Hands-on robotics, AI, and electronics for ages 6–26.
        </p>
      </motion.div>

      <motion.div
        whileHover={{ y: -3 }}
        transition={{ duration: 0.2 }}
        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1.5 hover:border-slate-300 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Trophy className="w-4 h-4" strokeWidth={2.2} />
        </div>
        <h2 className="text-sm font-bold text-slate-900">Champion Teams</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Proven record of national and global titles in FIRST LEGO League (FLL), VEX, and RoboCup.
        </p>
      </motion.div>

      <motion.div
        whileHover={{ y: -3 }}
        transition={{ duration: 0.2 }}
        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1.5 hover:border-slate-300 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Globe2 className="w-4 h-4" strokeWidth={2.2} />
        </div>
        <h2 className="text-sm font-bold text-slate-900">20+ Branches</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Serving students across Cairo, Giza, Alexandria, Delta, and Upper Egypt &bull; Plus KSA & Tunisia.
        </p>
      </motion.div>
    </motion.div>
  );
}
