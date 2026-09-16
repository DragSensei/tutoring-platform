'use client';

import { motion } from 'motion/react';
import { HeroSection } from './_components/HeroSection';
import { PillarsSection } from './_components/PillarsSection';
import { AcademyIntel } from './_components/AcademyIntel';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

export default function HomePage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="min-h-[calc(100vh-12rem)] flex flex-col justify-center items-center text-center max-w-4xl mx-auto px-4 py-4 space-y-8"
    >
      <HeroSection />
      <PillarsSection />
      <AcademyIntel />
    </motion.div>
  );
}
