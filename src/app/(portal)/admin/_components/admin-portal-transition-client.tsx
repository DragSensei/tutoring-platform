'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';

export function AdminPortalTransitionClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="w-full min-w-0"
    >
      {children}
    </motion.div>
  );
}
