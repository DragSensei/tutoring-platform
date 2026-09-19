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
  Globe,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavCluster {
  title: string;
  items: NavItem[];
}

const NAV_CLUSTERS: NavCluster[] = [
  {
    title: 'ACADEMY CORE',
    items: [
      { label: 'Overview', href: '/admin', icon: LayoutDashboard },
      { label: 'Timetable', href: '/admin/gadwal', icon: CalendarDays },
    ],
  },
  {
    title: 'FINANCIALS',
    items: [
      { label: 'Wallets & Balance', href: '/admin/wallets', icon: Wallet },
    ],
  },
  {
    title: 'GOVERNANCE',
    items: [
      { label: 'Faculty Mentors', href: '/admin/mentors', icon: Users },
      { label: 'Platform Policies', href: '/admin/policies', icon: SlidersHorizontal },
    ],
  },
];

interface AdminSidebarProps {
  mobileOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({
  mobileOnly,
  isCollapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [isOpenMobile, setIsOpenMobile] = React.useState(false);

  const isActiveRoute = (href: string) => {
    if (!href || href === '#' || href === '' || href.startsWith('#')) {
      return false;
    }
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname === href || (href !== '/admin' && pathname.startsWith(href + '/'));
  };

  const renderNavClusters = (onItemClick?: () => void) => (
    <>
      {NAV_CLUSTERS.map((cluster) => (
        <div key={cluster.title}>
          {!isCollapsed ? (
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-600/70 px-4 mb-2">
              {cluster.title}
            </p>
          ) : (
            <div className="border-t border-stone-100 my-2 mx-1" aria-hidden="true" />
          )}
          <nav className="space-y-1">
            {cluster.items.map((item) => {
              const active = isActiveRoute(item.href);
              const Icon = item.icon;

              if (isCollapsed) {
                return (
                  <div key={item.href} className="relative group flex justify-center">
                    <Link
                      href={item.href}
                      onClick={onItemClick}
                      aria-label={item.label}
                      title={item.label}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg mx-1 text-sm transition-colors ${
                        active
                          ? 'bg-brand-primary text-white font-semibold shadow-xs'
                          : 'text-stone-700 hover:bg-stone-100/70 hover:text-stone-900 font-medium'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                    </Link>

                    {/* Desktop Tooltip */}
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-stone-900 text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                      {item.label}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-stone-900" />
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onItemClick}
                  className={`min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-lg mx-2 text-sm transition-colors ${
                    active
                      ? 'bg-brand-primary text-white font-semibold shadow-xs'
                      : 'text-stone-700 hover:bg-stone-100/70 hover:text-stone-900 font-medium'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </>
  );

  if (mobileOnly) {
    return (
      <>
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
          <span className="text-xs font-bold tracking-wider text-stone-900 uppercase">
            Big Hero Admin
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpenMobile(true)}
          aria-label="Open admin navigation"
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {isOpenMobile && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsOpenMobile(false)}
              aria-hidden="true"
            />

            <div className="relative ml-auto w-72 max-w-[80vw] h-full bg-white shadow-xl flex flex-col border-l border-stone-200">
              <div className="h-16 flex items-center justify-between px-5 border-b border-stone-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                  <span className="text-xs font-bold tracking-wider text-stone-900 uppercase">
                    Big Hero Admin
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpenMobile(false)}
                  aria-label="Close admin navigation"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-sm text-stone-500 hover:text-stone-900 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
                {renderNavClusters(() => setIsOpenMobile(false))}
              </div>

              <div className="mt-auto p-4 border-t border-stone-100 shrink-0">
                <Link
                  href="/"
                  onClick={() => setIsOpenMobile(false)}
                  className="min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100/70 transition-colors"
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  <span>🌐 Public Site</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Top Header */}
      {!isCollapsed ? (
        <div className="h-16 flex items-center justify-between px-5 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-primary shrink-0" />
            <span className="text-xs font-bold tracking-wider text-stone-900 uppercase truncate">
              Big Hero Admin
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-sm text-stone-400 hover:text-stone-700 hover:bg-stone-100/70 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center border-b border-stone-100 shrink-0 px-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-100/70 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Clustered Navigation Body */}
      <div
        className={`flex-1 py-5 space-y-6 ${
          isCollapsed ? 'overflow-visible px-2' : 'overflow-y-auto px-1'
        }`}
      >
        {renderNavClusters()}
      </div>

      {/* Bottom Pin */}
      {!isCollapsed ? (
        <div className="mt-auto p-4 border-t border-stone-100 shrink-0">
          <Link
            href="/"
            className="min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-lg mx-2 text-sm font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100/70 transition-colors"
          >
            <Globe className="h-4 w-4 shrink-0" />
            <span>🌐 Public Site</span>
          </Link>
        </div>
      ) : (
        <div className="mt-auto p-3 border-t border-stone-100 shrink-0 flex justify-center">
          <div className="relative group">
            <Link
              href="/"
              aria-label="Public Site"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-sm text-stone-500 hover:text-stone-800 hover:bg-stone-100/70 transition-colors"
            >
              <Globe className="h-4 w-4 shrink-0" />
            </Link>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-stone-900 text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
              Public Site
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-stone-900" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
