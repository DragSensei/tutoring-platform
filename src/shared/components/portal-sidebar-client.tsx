'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Globe,
  LogOut,
} from 'lucide-react';

export interface SerializedNavItem {
  label: string;
  href: string;
  iconNode: React.ReactNode;
}

export interface SerializedNavCluster {
  title?: string;
  items: SerializedNavItem[];
}

export interface PortalSidebarClientProps {
  roleTitle: string;
  roleSubtitle?: string;
  portalRoot: string;
  hasGlobalHeader?: boolean;
  clusters: SerializedNavCluster[];
  bottomActionLabel?: string;
  bottomActionHref?: string;
  mobileOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  collapsible?: boolean;
  asAside?: boolean;
  roleLabel?: string;
  userName?: string;
  userEmail?: string;
}

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

export const expandedNavRowClasses =
  'min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-lg mx-2 text-sm transition-colors';
export const collapsedNavRowClasses =
  'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg mx-1 text-sm transition-colors';

export function getNavRowTone(active: boolean) {
  return active
    ? 'bg-brand-primary text-white font-semibold shadow-xs'
    : 'text-stone-700 hover:bg-stone-100/70 hover:text-stone-900 font-medium';
}

function PortalIdentity({
  roleTitle,
  roleSubtitle,
  userName,
}: {
  roleTitle: string;
  roleSubtitle?: string;
  userName?: string;
  userEmail?: string;
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
            {userName ? `${userName} (${roleSubtitle})` : roleSubtitle}
          </span>
        </div>
      ) : (
        <div className="min-w-0">
          <span className="text-xs font-bold tracking-wider text-stone-900 uppercase truncate block">
            {roleTitle}
          </span>
          {userName && (
            <span className="text-xs text-stone-500 truncate block">
              {userName}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function PortalSidebarClient({
  roleTitle,
  roleSubtitle,
  portalRoot,
  hasGlobalHeader = false,
  clusters,
  bottomActionLabel = 'Public Site',
  bottomActionHref = '/',
  mobileOnly = false,
  isCollapsed = false,
  onToggleCollapse,
  collapsible = true,
  asAside = true,
  roleLabel,
  userName,
  userEmail,
}: PortalSidebarClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpenMobile, setIsOpenMobile] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [internalCollapsed, setInternalCollapsed] = React.useState(Boolean(isCollapsed));
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  const isControlled = typeof onToggleCollapse === 'function';
  const effectiveCollapsed = isControlled ? Boolean(isCollapsed) : internalCollapsed;
  const effectiveToggle = isControlled
    ? onToggleCollapse
    : collapsible
    ? () => setInternalCollapsed((prev) => !prev)
    : undefined;

  React.useEffect(() => {
    if (!isControlled && isCollapsed !== undefined) {
      setInternalCollapsed(Boolean(isCollapsed));
    }
  }, [isControlled, isCollapsed]);

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

  const effectiveRoleTitle = roleLabel || roleTitle;

  const renderNavClusters = (onItemClick?: () => void, forceExpanded = false) => {
    const isCurrentlyCollapsed = forceExpanded ? false : effectiveCollapsed;

    return (
      <>
        {clusters.map((cluster, clusterIndex) => (
          <div key={cluster.title || `cluster-${clusterIndex}`}>
            {cluster.title && (
              !isCurrentlyCollapsed ? (
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-600/70 px-4 mb-2">
                  {cluster.title}
                </p>
              ) : (
                <div className="border-t border-stone-100 my-2 mx-1" aria-hidden="true" />
              )
            )}
            <nav className="space-y-1">
              {cluster.items.map((item) => {
                const active = isActivePortalRoute(pathname, item.href, portalRoot);

                if (isCurrentlyCollapsed) {
                  return (
                    <div key={item.href} className="relative group flex justify-center">
                      <Link
                        href={item.href}
                        onClick={onItemClick}
                        aria-label={item.label}
                        title={item.label}
                        className={`${collapsedNavRowClasses} ${getNavRowTone(active)}`}
                      >
                        {item.iconNode}
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
                    {item.iconNode}
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
          roleTitle={effectiveRoleTitle}
          roleSubtitle={roleSubtitle}
          userName={userName}
          userEmail={userEmail}
        />

        <button
          type="button"
          onClick={() => setIsOpenMobile(true)}
          aria-label={`Open ${effectiveRoleTitle} navigation`}
          aria-expanded={isOpenMobile}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {isOpenMobile && (
          <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={`${effectiveRoleTitle} navigation`}>
            <div
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsOpenMobile(false)}
              aria-hidden="true"
            />

            <div className="relative ml-auto w-72 max-w-[80vw] h-full bg-white shadow-xl flex flex-col border-l border-stone-200">
              <div className="h-16 flex items-center justify-between px-5 border-b border-stone-100 shrink-0">
                <PortalIdentity
                  roleTitle={effectiveRoleTitle}
                  roleSubtitle={roleSubtitle}
                  userName={userName}
                  userEmail={userEmail}
                />
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setIsOpenMobile(false)}
                  aria-label={`Close ${effectiveRoleTitle} navigation`}
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
                  href={bottomActionHref || '/'}
                  onClick={() => setIsOpenMobile(false)}
                  className="min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100/70 transition-colors"
                >
                  <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{bottomActionLabel || 'Public Site'}</span>
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
      {effectiveToggle ? (
        !effectiveCollapsed ? (
          <div className="h-16 flex items-center justify-between px-5 border-b border-stone-100 shrink-0">
            <PortalIdentity
              roleTitle={effectiveRoleTitle}
              roleSubtitle={roleSubtitle}
              userName={userName}
              userEmail={userEmail}
            />
            <button
              type="button"
              onClick={effectiveToggle}
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
              onClick={effectiveToggle}
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
            roleTitle={effectiveRoleTitle}
            roleSubtitle={roleSubtitle}
            userName={userName}
            userEmail={userEmail}
          />
        </div>
      )}

      {/* Clustered Navigation Body */}
      <div
        className={`flex-1 min-h-0 py-5 space-y-6 ${
          effectiveCollapsed ? 'overflow-visible px-2' : 'overflow-y-auto px-1'
        }`}
      >
        {renderNavClusters()}
      </div>

      {/* Bottom Pin */}
      {!effectiveCollapsed ? (
        <div className="mt-auto py-4 px-1 border-t border-stone-100 shrink-0">
          <nav className="space-y-1" aria-label="Portal actions">
            <Link
              href={bottomActionHref || '/'}
              className={`${expandedNavRowClasses} font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100/70`}
            >
              <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{bottomActionLabel || 'Public Site'}</span>
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
                href={bottomActionHref || '/'}
                aria-label={bottomActionLabel || 'Public Site'}
                title={bottomActionLabel || 'Public Site'}
                className={`${collapsedNavRowClasses} text-stone-500 hover:text-stone-800 hover:bg-stone-100/70`}
              >
                <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-stone-900 text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                {bottomActionLabel || 'Public Site'}
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
        hasGlobalHeader,
        isCollapsed: effectiveCollapsed,
      })}
      aria-label={`${effectiveRoleTitle} sidebar`}
    >
      {sidebarContent}
    </aside>
  );
}
