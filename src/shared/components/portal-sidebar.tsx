'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  CircleDollarSign,
  Users,
  UserRoundSearch,
  SlidersHorizontal,
  Globe,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ListTodo,
  History,
  LogOut,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

export interface NavCluster {
  title?: string;
  items: NavItem[];
}

export interface PortalNavigationConfig {
  roleTitle: string;
  roleSubtitle?: string;
  portalRoot: string;
  hasGlobalHeader?: boolean;
  clusters: NavCluster[];
  bottomActionLabel?: string;
  bottomActionHref?: string;
}

export const adminNavigation: PortalNavigationConfig = {
  roleTitle: 'Big Hero Admin',
  portalRoot: '/admin',
  hasGlobalHeader: false,
  bottomActionLabel: 'Public Site',
  bottomActionHref: '/',
  clusters: [
    {
      title: 'ACADEMY CORE',
      items: [
        { label: 'Overview', href: '/admin', icon: LayoutDashboard },
        { label: 'Timetable', href: '/admin/gadwal', icon: CalendarDays },
        { label: 'Accounts', href: '/admin/accounts', icon: UserRoundSearch },
      ],
    },
    {
      title: 'FINANCIALS',
      items: [
        { label: 'Finances', href: '/admin/finances', icon: CircleDollarSign },
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
  ],
};

export const tutorNavigation: PortalNavigationConfig = {
  roleTitle: 'Big Hero Tutor',
  roleSubtitle: 'Faculty portal',
  portalRoot: '/tutor',
  hasGlobalHeader: false,
  bottomActionLabel: 'Public Site',
  bottomActionHref: '/',
  clusters: [
    {
      items: [
        { label: 'Agenda', href: '/tutor/agenda', icon: ListTodo },
        { label: 'Timetable', href: '/tutor/timetable', icon: CalendarDays },
        { label: 'History', href: '/tutor/history', icon: History },
      ],
    },
  ],
};

export const studentNavigation: PortalNavigationConfig = {
  roleTitle: 'Big Hero Student',
  roleSubtitle: 'Student portal',
  portalRoot: '/student',
  hasGlobalHeader: false,
  bottomActionLabel: 'Public Site',
  bottomActionHref: '/',
  clusters: [
    {
      items: [
        { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
        { label: 'Wallet & Ledger', href: '/student/wallet', icon: Wallet },
      ],
    },
  ],
};

export function isActivePortalRoute(pathname: string, href: string, portalRoot?: string): boolean {
  if (!href || href === '#' || href === '' || href.startsWith('#')) {
    return false;
  }
  if (href === '/admin') {
    return pathname === '/admin';
  }
  if (portalRoot && href === portalRoot) {
    return pathname === portalRoot;
  }
  return pathname === href || (href !== '/admin' && href !== portalRoot && pathname.startsWith(href + '/'));
}

export function getPortalSidebarAsideClasses({
  hasGlobalHeader = false,
  isCollapsed = false,
}: {
  hasGlobalHeader?: boolean;
  isCollapsed?: boolean;
} = {}): string {
  const widthClass = isCollapsed ? 'w-18' : 'w-64';
  const stickyClass = hasGlobalHeader
    ? 'sticky top-16 h-[calc(100vh-4rem)]'
    : 'sticky top-0 h-screen';

  return `hidden md:flex flex-col ${widthClass} min-w-0 shrink-0 border-r border-stone-200/80 bg-white ${stickyClass} transition-[width] duration-300 ease-in-out`;
}

const expandedNavRowClasses =
  'min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-lg mx-2 text-sm transition-colors';
const collapsedNavRowClasses =
  'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg mx-1 text-sm transition-colors';

function getNavRowTone(active: boolean) {
  return active
    ? 'bg-brand-primary text-white font-semibold shadow-xs'
    : 'text-stone-700 hover:bg-stone-100/70 hover:text-stone-900 font-medium';
}

function PortalIdentity({
  roleTitle,
  roleSubtitle,
}: {
  roleTitle: string;
  roleSubtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
      <span className="w-2.5 h-2.5 rounded-full bg-brand-primary shrink-0" aria-hidden="true" />
      {roleSubtitle ? (
        <div className="min-w-0">
          <span className="text-xs font-bold tracking-wider text-stone-900 uppercase truncate block">
            {roleTitle}
          </span>
          <span className="text-xs text-stone-500 truncate block">
            {roleSubtitle}
          </span>
        </div>
      ) : (
        <span className="text-xs font-bold tracking-wider text-stone-900 uppercase truncate">
          {roleTitle}
        </span>
      )}
    </div>
  );
}

export interface PortalSidebarProps {
  config: PortalNavigationConfig;
  mobileOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  asAside?: boolean;
}

export function PortalSidebar({
  config,
  mobileOnly = false,
  isCollapsed = false,
  onToggleCollapse,
  asAside = true,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const [isOpenMobile, setIsOpenMobile] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const router = useRouter();
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!isOpenMobile) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpenMobile(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpenMobile]);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  const renderNavClusters = (onItemClick?: () => void, forceExpanded = false) => {
    const effectiveCollapsed = forceExpanded ? false : isCollapsed;

    return (
      <>
        {config.clusters.map((cluster, clusterIndex) => (
          <div key={cluster.title || `cluster-${clusterIndex}`}>
            {cluster.title && (
              !effectiveCollapsed ? (
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-600/70 px-4 mb-2">
                  {cluster.title}
                </p>
              ) : (
                <div className="border-t border-stone-100 my-2 mx-1" aria-hidden="true" />
              )
            )}
            <nav className="space-y-1">
              {cluster.items.map((item) => {
                const active = isActivePortalRoute(pathname, item.href, config.portalRoot);
                const Icon = item.icon;

                if (effectiveCollapsed) {
                  return (
                    <div key={item.href} className="relative group flex justify-center">
                      <Link
                        href={item.href}
                        onClick={onItemClick}
                        aria-label={item.label}
                        title={item.label}
                        className={`${collapsedNavRowClasses} ${getNavRowTone(active)}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
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
                    aria-current={active ? 'page' : undefined}
                    className={`${expandedNavRowClasses} ${getNavRowTone(active)}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </>
    );
  };

  if (mobileOnly) {
    return (
      <>
        <PortalIdentity
          roleTitle={config.roleTitle}
          roleSubtitle={config.roleSubtitle}
        />

        <button
          type="button"
          onClick={() => setIsOpenMobile(true)}
          aria-label={`Open ${config.roleTitle} navigation`}
          aria-expanded={isOpenMobile}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {isOpenMobile && (
          <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={`${config.roleTitle} navigation`}>
            <div
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsOpenMobile(false)}
              aria-hidden="true"
            />

            <div className="relative ml-auto w-72 max-w-[80vw] h-full bg-white shadow-xl flex flex-col border-l border-stone-200">
              <div className="h-16 flex items-center justify-between px-5 border-b border-stone-100 shrink-0">
                <PortalIdentity
                  roleTitle={config.roleTitle}
                  roleSubtitle={config.roleSubtitle}
                />
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setIsOpenMobile(false)}
                  aria-label={`Close ${config.roleTitle} navigation`}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-sm text-stone-500 hover:text-stone-900 transition-colors"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
                {renderNavClusters(() => setIsOpenMobile(false), true)}
              </div>

              <div className="mt-auto p-4 border-t border-stone-100 shrink-0">
                <Link
                  href={config.bottomActionHref || '/'}
                  onClick={() => setIsOpenMobile(false)}
                  className="min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100/70 transition-colors"
                >
                  <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{config.bottomActionLabel || 'Public Site'}</span>
                </Link>
                <button type="button" onClick={() => void handleLogout()} disabled={isLoggingOut} className="mt-1 min-h-[44px] w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-stone-500 hover:bg-stone-100/70 hover:text-stone-800 disabled:opacity-50">
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{isLoggingOut ? 'Signing out…' : 'Logout'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full min-h-0">
      {/* Top Header */}
      {onToggleCollapse ? (
        !isCollapsed ? (
          <div className="h-16 flex items-center justify-between px-5 border-b border-stone-100 shrink-0">
            <PortalIdentity
              roleTitle={config.roleTitle}
              roleSubtitle={config.roleSubtitle}
            />
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-sm text-stone-400 hover:text-stone-700 hover:bg-stone-100/70 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
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
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )
      ) : (
        <div className="h-16 flex items-center px-5 border-b border-stone-100 shrink-0">
          <PortalIdentity
            roleTitle={config.roleTitle}
            roleSubtitle={config.roleSubtitle}
          />
        </div>
      )}

      {/* Clustered Navigation Body */}
      <div
        className={`flex-1 min-h-0 py-5 space-y-6 ${
          isCollapsed ? 'overflow-visible px-2' : 'overflow-y-auto px-1'
        }`}
      >
        {renderNavClusters()}
      </div>

      {/* Bottom Pin */}
      {!isCollapsed ? (
        <div className="mt-auto py-4 px-1 border-t border-stone-100 shrink-0">
          <nav className="space-y-1" aria-label="Portal actions">
            <Link
              href={config.bottomActionHref || '/'}
              className={`${expandedNavRowClasses} font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100/70`}
            >
              <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{config.bottomActionLabel || 'Public Site'}</span>
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              className={`${expandedNavRowClasses} w-full text-left font-medium text-stone-500 hover:bg-stone-100/70 hover:text-stone-800 disabled:opacity-50`}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{isLoggingOut ? 'Signing out…' : 'Logout'}</span>
            </button>
          </nav>
        </div>
      ) : (
        <div className="mt-auto py-3 px-2 border-t border-stone-100 shrink-0">
          <nav className="space-y-1" aria-label="Portal actions">
            <div className="relative group flex justify-center">
              <Link
                href={config.bottomActionHref || '/'}
                aria-label={config.bottomActionLabel || 'Public Site'}
                title={config.bottomActionLabel || 'Public Site'}
                className={`${collapsedNavRowClasses} text-stone-500 hover:text-stone-800 hover:bg-stone-100/70`}
              >
                <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-stone-900 text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                {config.bottomActionLabel || 'Public Site'}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-stone-900" />
              </div>
            </div>
            <div className="relative group flex justify-center">
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                aria-label="Logout"
                title="Logout"
                className={`${collapsedNavRowClasses} text-stone-500 hover:bg-stone-100/70 hover:text-stone-800 disabled:opacity-50`}
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-stone-900 text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                Logout
              </div>
            </div>
          </nav>
        </div>
      )}
    </div>
  );

  if (!asAside) {
    return sidebarContent;
  }

  return (
    <aside
      className={getPortalSidebarAsideClasses({
        hasGlobalHeader: config.hasGlobalHeader,
        isCollapsed,
      })}
      aria-label={`${config.roleTitle} sidebar`}
    >
      {sidebarContent}
    </aside>
  );
}
