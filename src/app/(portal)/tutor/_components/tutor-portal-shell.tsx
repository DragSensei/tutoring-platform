import type { ReactNode } from 'react';
import { TutorSidebar } from './tutor-sidebar';

export interface TutorPortalShellProps {
  children: ReactNode;
  userName?: string;
  userEmail?: string;
}

export function TutorPortalShell({ children, userName, userEmail }: TutorPortalShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-canvas">
      <TutorSidebar userName={userName} userEmail={userEmail} />
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <header className="flex items-center justify-between border-b border-stone-200/80 bg-white px-4 py-3 md:hidden">
          <TutorSidebar mobileOnly userName={userName} userEmail={userEmail} />
        </header>
        <main className="w-full min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
