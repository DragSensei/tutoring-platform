import type { ReactNode } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { AdminPortalTransitionClient } from './admin-portal-transition-client';

export interface AdminPortalShellProps {
  children: ReactNode;
  userName?: string;
  userEmail?: string;
}

export function AdminPortalShell({ children, userName, userEmail }: AdminPortalShellProps) {
  return (
    <div className="flex min-h-screen bg-canvas w-full">
      <AdminSidebar userName={userName} userEmail={userEmail} />
      <div className="flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out bg-canvas">
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-stone-200/80 bg-white">
          <AdminSidebar mobileOnly userName={userName} userEmail={userEmail} />
        </div>
        <main className="min-w-0 flex-1 overflow-x-hidden p-6 lg:p-10 w-full bg-canvas">
          <AdminPortalTransitionClient>{children}</AdminPortalTransitionClient>
        </main>
      </div>
    </div>
  );
}
