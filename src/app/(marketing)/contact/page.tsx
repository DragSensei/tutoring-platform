'use client';

import { motion } from 'motion/react';
import { ContactHeader } from './_components/ContactHeader';
import { ContactCard } from './_components/ContactCard';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
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
      <ContactHeader />
      <ContactCard />
    </motion.div>
  );
}
