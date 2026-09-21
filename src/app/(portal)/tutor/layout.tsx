'use client';

import type { ReactNode } from 'react';
import * as React from 'react';
import { TutorSidebar } from './_components/tutor-sidebar';

export default function TutorLayout({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  return (
    <div className="flex min-h-screen w-full bg-canvas">
      <TutorSidebar isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed((current) => !current)} />
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <header className="flex items-center justify-between border-b border-stone-200/80 bg-white px-4 py-3 md:hidden">
          <TutorSidebar mobileOnly />
        </header>
        <main className="w-full min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
