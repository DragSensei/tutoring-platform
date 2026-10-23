import {
  PortalSidebar,
  adminNavigation,
  type PortalSidebarProps,
} from '@/shared/components/portal-sidebar';

export interface AdminSidebarProps {
  mobileOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  collapsible?: boolean;
  asAside?: boolean;
  userName?: string;
  userEmail?: string;
}

export function AdminSidebar(props: AdminSidebarProps) {
  return <PortalSidebar config={adminNavigation} collapsible {...props} />;
}
