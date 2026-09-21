'use client';

import {
  PortalSidebar,
  studentNavigation,
} from '@/shared/components/portal-sidebar';

export interface StudentSidebarProps {
  mobileOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  asAside?: boolean;
}

export function StudentSidebar(props: StudentSidebarProps) {
  return <PortalSidebar config={studentNavigation} {...props} />;
}
