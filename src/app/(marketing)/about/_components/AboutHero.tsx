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

export function AboutHero() {
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

      <motion.div variants={itemVariants} className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          About Big Hero Robotics Academy
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed max-w-xl mx-auto">
          Founded in 2017 by <strong className="text-slate-800">Eng. Hossam Mohamed Zayed</strong>, Big Hero Robotics is Egypt’s leading engineering and STEM academy, certified by the <strong className="text-red-600">Egyptian Engineers Syndicate</strong> (نقابة المهندسين المصرية).
        </p>
      </motion.div>
    </>
  );
}
