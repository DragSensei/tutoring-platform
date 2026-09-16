'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function AboutPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-2xl mx-auto py-8 text-center space-y-6"
    >
      {/* Academy Logo */}
      <motion.div variants={itemVariants} className="relative w-16 h-16 mx-auto">
        <Image
          src="/logo.png"
          alt="Big Hero Robotics Academy"
          fill
          className="object-contain"
          priority
        />
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          About Big Hero Robotics Academy
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed max-w-xl mx-auto">
          Founded in 2017 by <strong className="text-slate-800">Eng. Hossam Mohamed Zayed</strong>, Big Hero Robotics is Egypt’s leading engineering and STEM academy, certified by the <strong className="text-red-600">Egyptian Engineers Syndicate</strong> (نقابة المهندسين المصرية).
        </p>
      </motion.div>

      {/* Core Credentials & Highlights */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1.5 hover:border-slate-300 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-base font-bold">
            🎓
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
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-base font-bold">
            🏆
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
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-base font-bold">
            🌍
          </div>
          <h2 className="text-sm font-bold text-slate-900">20+ Branches</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Serving students across Cairo, Giza, Alexandria, Delta, and Upper Egypt &bull; Plus KSA & Tunisia.
          </p>
        </motion.div>
      </motion.div>

      {/* Extended Mission Card */}
      <motion.div
        variants={itemVariants}
        className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm text-left space-y-3 text-xs text-slate-600 leading-relaxed"
      >
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>🚀</span> Our Mentorship Philosophy
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

      {/* Back Link */}
      <motion.div variants={itemVariants} className="pt-2">
        <Link
          href="/"
          className="text-sm font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1.5 transition-colors"
        >
          &larr; Back to Home
        </Link>
      </motion.div>
    </motion.div>
  );
}
