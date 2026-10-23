import type { ReactNode } from 'react';
import { StudentSidebar } from './student-sidebar';

export interface StudentPortalShellProps {
  children: ReactNode;
  userName?: string;
  userEmail?: string;
}

export function StudentPortalShell({ children, userName, userEmail }: StudentPortalShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-canvas">
      <StudentSidebar userName={userName} userEmail={userEmail} />
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <header className="flex items-center justify-between border-b border-stone-200/80 bg-white px-4 py-3 md:hidden">
          <StudentSidebar mobileOnly userName={userName} userEmail={userEmail} />
        </header>
        <main className="w-full min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
