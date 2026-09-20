'use client';

import {
  PortalSidebar,
  adminNavigation,
  type PortalSidebarProps,
} from '@/shared/components/portal-sidebar';

export interface AdminSidebarProps {
  mobileOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  asAside?: boolean;
}

export function AdminSidebar(props: AdminSidebarProps) {
  return <PortalSidebar config={adminNavigation} {...props} />;
}
