'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { AdminSidebar } from './admin-sidebar';

export function AdminPortalShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-canvas w-full">
      <AdminSidebar isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed((prev) => !prev)} />
      <div className="flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out bg-canvas">
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-stone-200/80 bg-white"><AdminSidebar mobileOnly /></div>
        <main className="flex-1 min-w-0 p-6 lg:p-10 w-full bg-canvas">
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="w-full min-w-0">{children}</motion.div>
        </main>
      </div>
    </div>
  );
}
