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

export default function ContactPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-xl mx-auto py-8 text-center space-y-6"
    >
      <motion.div variants={itemVariants} className="relative w-16 h-16 mx-auto">
        <Image
          src="/logo.png"
          alt="Big Hero Robotics Academy"
          fill
          className="object-contain"
          priority
        />
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-1.5">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Contact Big Hero Robotics</h1>
        <p className="text-slate-600 text-sm">
          Have questions about robotics programs, competition teams, or session schedules? We are here to help!
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-left space-y-4 text-sm"
      >
        <div className="group">
          <span className="text-xs text-slate-400 block font-semibold">DIRECT HOTLINE / WHATSAPP</span>
          <a
            href="https://wa.me/201222298892"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-base font-bold text-red-600 hover:underline inline-flex items-center gap-1.5"
          >
            +20 122 229 8892 &rarr;
          </a>
        </div>

        <div>
          <span className="text-xs text-slate-400 block font-semibold">OFFICIAL EMAIL</span>
          <a
            href="mailto:info@bigherorobotics.com"
            className="font-mono text-base font-bold text-slate-800 hover:text-red-600 transition-colors"
          >
            info@bigherorobotics.com
          </a>
        </div>

        <div>
          <span className="text-xs text-slate-400 block font-semibold">ACADEMY BRANCHES (20+ LOCATIONS)</span>
          <span className="text-slate-700 font-medium leading-relaxed block">
            Dokki (Giza), Nasr City, Heliopolis, Maadi, Alexandria, Delta, and Upper Egypt &bull; Regional in KSA & Tunisia
          </span>
        </div>

        <div>
          <span className="text-xs text-slate-400 block font-semibold">OFFICIAL ACCREDITATION</span>
          <span className="text-slate-700 font-medium block">
            Certified by the Egyptian Engineers Syndicate (نقابة المهندسين المصرية)
          </span>
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
    </motion.div>
  );
}
