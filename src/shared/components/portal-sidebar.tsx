import * as React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  CircleDollarSign,
  Users,
  UserRoundSearch,
  SlidersHorizontal,
  ListTodo,
  History,
} from 'lucide-react';
import {
  PortalSidebarClient,
  isActivePortalRoute,
  getPortalSidebarAsideClasses,
  type SerializedNavCluster,
} from './portal-sidebar-client';

export { isActivePortalRoute, getPortalSidebarAsideClasses };

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

export type PortalNavItem = NavItem;

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
        { label: 'Needs Attention', href: '/admin/needs-attention', icon: ListTodo },
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

export interface PortalSidebarProps {
  config: PortalNavigationConfig;
  mobileOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  collapsible?: boolean;
  asAside?: boolean;
  roleLabel?: string;
  userName?: string;
  userEmail?: string;
}

export function PortalSidebar({
  config,
  mobileOnly = false,
  isCollapsed = false,
  onToggleCollapse,
  collapsible,
  asAside = true,
  roleLabel,
  userName,
  userEmail,
}: PortalSidebarProps) {
  const serializedClusters: SerializedNavCluster[] = config.clusters.map((cluster) => ({
    title: cluster.title,
    items: cluster.items.map((item) => {
      const Icon = item.icon;
      return {
        label: item.label,
        href: item.href,
        iconNode: <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />,
      };
    }),
  }));

  return (
    <PortalSidebarClient
      roleTitle={config.roleTitle}
      roleSubtitle={config.roleSubtitle}
      portalRoot={config.portalRoot}
      hasGlobalHeader={config.hasGlobalHeader}
      clusters={serializedClusters}
      bottomActionLabel={config.bottomActionLabel}
      bottomActionHref={config.bottomActionHref}
      mobileOnly={mobileOnly}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      collapsible={collapsible}
      asAside={asAside}
      roleLabel={roleLabel}
      userName={userName}
      userEmail={userEmail}
    />
  );
}
