'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

export interface RootShellClientProps {
  children: React.ReactNode;
  landingNavbar: React.ReactNode;
  navbar: React.ReactNode;
  footer: React.ReactNode;
}

export function RootShellClient({ children, landingNavbar, navbar, footer }: RootShellClientProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const isPortal = pathname?.startsWith('/tutor') || pathname?.startsWith('/student');
  const isLandingPage = pathname === '/';

  if (isAdmin || isPortal) {
    return <div className="flex-1 w-full flex flex-col">{children}</div>;
  }

  return (
    <>
      {isLandingPage ? landingNavbar : navbar}
      <main className={`flex-1 w-full flex flex-col ${isLandingPage ? 'max-w-none px-4 sm:px-6 py-0' : 'max-w-7xl mx-auto px-4 sm:px-6 py-6'}`}>
        {children}
      </main>
      {footer}
    </>
  );
}
