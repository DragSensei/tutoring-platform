'use client';

import Image from 'next/image';
import { motion } from 'motion/react';

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export function ContactHeader() {
  return (
    <>
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
    </>
  );
}
