import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getRoleRedirectPath } from '@/features/auth/role-redirect';
import type { SessionPayload } from '@/features/auth/server/session';
import { RootShellClient } from './root-shell-client';

export interface SiteNavbarProps {
  session: SessionPayload | null;
  isLandingPage?: boolean;
}

export function SiteNavbar({ session, isLandingPage = false }: SiteNavbarProps) {
  const primaryHref = session ? getRoleRedirectPath(session.role) : '/login';
  const primaryLabel = session ? 'Dashboard' : isLandingPage ? 'Academy Portal' : 'Sign In';
  const primaryPortalLink = (
    <Link
      href={primaryHref}
      className={isLandingPage
        ? 'min-h-[44px] inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-bold shadow-sm transition-colors bg-primary-action text-white hover:bg-brand-hover col-start-3 row-start-2 justify-self-end lg:row-start-1 lg:justify-self-end'
        : 'min-h-[44px] inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm ml-2'}
    >
      {primaryLabel}
    </Link>
  );

  return (
    <header className={isLandingPage ? 'sticky top-0 z-50 border-b backdrop-blur-sm border-marketing-foreground/10 bg-marketing-background text-marketing-foreground lg:h-16' : 'border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50 h-16'}>
      <div className={isLandingPage ? 'mx-auto px-4 sm:px-6 grid max-w-screen-2xl grid-cols-[1fr_auto_1fr] items-center gap-x-1 gap-y-1 py-2 lg:h-full lg:gap-0 lg:py-0' : 'max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between'}>
        {/* Brand Logo & Name */}
        <Link href="/" className={`flex items-center gap-3 group ${isLandingPage ? 'min-h-[44px] col-span-3 row-start-1 justify-self-center lg:col-span-1 lg:col-start-2' : ''}`}>
          <div className={`relative flex-shrink-0 ${isLandingPage ? 'h-11 w-11' : 'h-9 w-9'}`}>
            <Image
              src="/logo.png"
              alt="Big Hero Robotics Academy Logo"
              fill
              sizes={isLandingPage ? '44px' : '36px'}
              className="object-contain"
              priority
            />
          </div>
          <span className={`font-extrabold text-base tracking-tight ${isLandingPage ? 'text-marketing-foreground' : 'text-slate-900'}`}>
            Big Hero Robotics Online
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className={isLandingPage ? 'flex items-center justify-center gap-2 text-sm font-medium lg:gap-4 col-span-2 row-start-2 text-marketing-foreground lg:col-span-1 lg:col-start-1 lg:row-start-1 lg:justify-self-start' : 'flex items-center gap-4 text-sm font-medium text-slate-600'}>
          <Link href="/about" className={isLandingPage ? 'inline-flex min-h-[44px] min-w-[44px] items-center transition-colors hover:text-primary' : 'min-h-[44px] min-w-[44px] inline-flex items-center hover:text-red-600 transition-colors'}>
            About Us
          </Link>
          <Link href="/contact" className={isLandingPage ? 'inline-flex min-h-[44px] min-w-[44px] items-center transition-colors hover:text-primary' : 'min-h-[44px] min-w-[44px] inline-flex items-center hover:text-red-600 transition-colors'}>
            Contact Us
          </Link>
          {!isLandingPage && primaryPortalLink}
        </nav>
        {isLandingPage && primaryPortalLink}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div>
          <span className="font-semibold text-slate-700">Big Hero Robotics Academy</span> &bull; &copy; {new Date().getFullYear()}
        </div>

        <div className="flex items-center gap-3 text-slate-500">
          <Link href="/about" className="min-h-[44px] min-w-[44px] inline-flex items-center hover:text-slate-800 transition-colors">
            About Us
          </Link>
          <span>&bull;</span>
          <Link href="/contact" className="min-h-[44px] min-w-[44px] inline-flex items-center hover:text-slate-800 transition-colors">
            Contact Us
          </Link>
          <span>&bull;</span>
          <span className="font-mono text-[11px] text-slate-400">support@bigherorobotics.com</span>
        </div>
      </div>
    </footer>
  );
}

export function RootShell({ children, session }: { children: React.ReactNode; session: SessionPayload | null }) {
  return (
    <RootShellClient
      landingNavbar={<SiteNavbar session={session} isLandingPage />}
      navbar={<SiteNavbar session={session} isLandingPage={false} />}
      footer={<SiteFooter />}
    >
      {children}
    </RootShellClient>
  );
}
