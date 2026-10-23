import {
  PortalSidebar,
  tutorNavigation,
  type PortalSidebarProps,
} from '@/shared/components/portal-sidebar';

export interface TutorSidebarProps {
  mobileOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  collapsible?: boolean;
  asAside?: boolean;
  userName?: string;
  userEmail?: string;
}

export function TutorSidebar(props: TutorSidebarProps) {
  return <PortalSidebar config={tutorNavigation} collapsible {...props} />;
}
