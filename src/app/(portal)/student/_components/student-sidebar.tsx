'use client';

import {
  PortalSidebar,
  studentNavigation,
} from '@/shared/components/portal-sidebar';

export interface StudentSidebarProps {
  mobileOnly?: boolean;
  asAside?: boolean;
}

export function StudentSidebar(props: StudentSidebarProps) {
  return <PortalSidebar config={studentNavigation} {...props} />;
}
