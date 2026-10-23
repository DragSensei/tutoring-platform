import {
  PortalSidebar,
  studentNavigation,
  type PortalSidebarProps,
} from '@/shared/components/portal-sidebar';

export interface StudentSidebarProps {
  mobileOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  collapsible?: boolean;
  asAside?: boolean;
  userName?: string;
  userEmail?: string;
}

export function StudentSidebar(props: StudentSidebarProps) {
  return <PortalSidebar config={studentNavigation} collapsible {...props} />;
}
