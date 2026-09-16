'use client';

import { motion } from 'motion/react';
import { AboutHero } from './_components/AboutHero';
import { AboutCredentials } from './_components/AboutCredentials';
import { AboutMission } from './_components/AboutMission';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
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
      <AboutHero />
      <AboutCredentials />
      <AboutMission />
    </motion.div>
  );
}
