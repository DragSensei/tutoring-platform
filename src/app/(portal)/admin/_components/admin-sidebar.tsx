'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  Users,
  SlidersHorizontal,
  Menu,
  X,
  ShieldAlert,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Timetable (Gadwal)',
    href: '/admin/gadwal',
    icon: CalendarDays,
  },
  {
    label: 'Wallets & Balance',
    href: '/admin/wallets',
    icon: Wallet,
  },
  {
    label: 'Faculty Mentors',
    href: '/admin/mentors',
    icon: Users,
  },
  {
    label: 'Platform Policies',
    href: '/admin/policies',
    icon: SlidersHorizontal,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpenMobile, setIsOpenMobile] = React.useState(false);

  const isActiveRoute = (href: string) => {
    // If placeholder, empty, or anchor, never highlight
    if (!href || href === '#' || href === '' || href.startsWith('#')) {
      return false;
    }
    // Overview strict equality
    if (href === '/admin') {
      return pathname === '/admin';
    }
    // Subroutes exact match or directory prefix match
    return pathname === href || (href !== '/admin' && pathname.startsWith(href + '/'));
  };

  return (
    <>
      {/* Mobile Bar Trigger */}
      <div className="md:hidden flex items-center justify-between bg-white border border-stone-200/80 rounded-xl px-4 py-2.5 mb-6 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-brand-subtle border border-brand-border/60 px-2 py-0.5 text-xs font-bold text-brand-primary">
            Admin Console
          </span>
          <span className="text-xs font-semibold text-stone-700">Management Hub</span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpenMobile((prev) => !prev)}
          aria-label="Toggle admin navigation"
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
        >
          {isOpenMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpenMobile(false)}
          />

          <div className="relative ml-auto w-72 max-w-[80vw] h-full bg-white shadow-xl flex flex-col p-5 border-l border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <span className="font-bold text-sm text-stone-900">Admin Navigation</span>
              <button
                type="button"
                onClick={() => setIsOpenMobile(false)}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const active = isActiveRoute(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsOpenMobile(false)}
                    className={`min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      active
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar Card */}
      <div className="hidden md:block rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-5">
        <div className="flex items-center gap-2 px-1">
          <span className="inline-flex items-center rounded-md bg-brand-subtle border border-brand-border/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-primary">
            Admin Suite
          </span>
          <span className="text-xs font-semibold text-stone-500">Academy Hub</span>
        </div>

        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActiveRoute(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="pt-3 border-t border-stone-100 px-1">
          <div className="rounded-xl bg-stone-50 p-3 border border-stone-200/60 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-stone-800">4-Hour Deadline Law</p>
              <p className="text-xs text-stone-500 mt-0.5">
                Check-ins strictly lock 4h post start time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
