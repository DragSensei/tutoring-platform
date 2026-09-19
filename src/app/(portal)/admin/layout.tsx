'use client';

import * as React from 'react';
import { AdminSidebar } from './_components/admin-sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-canvas w-full">
      {/* Left Fixed Enterprise Column */}
      <aside
        className={`hidden md:flex flex-col ${
          isCollapsed ? 'w-18' : 'w-64'
        } shrink-0 border-r border-stone-200/80 bg-white min-h-screen sticky top-0 transition-[width] duration-300 ease-in-out`}
      >
        <AdminSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        />
      </aside>

      {/* Right Continuous Content Canvas */}
      <div className="flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out bg-canvas">
        {/* Mobile Trigger Header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-stone-200/80 bg-white">
          <AdminSidebar mobileOnly />
        </div>
        <main className="flex-1 min-w-0 p-6 lg:p-10 w-full bg-canvas">
          {children}
        </main>
      </div>
    </div>
  );
}
