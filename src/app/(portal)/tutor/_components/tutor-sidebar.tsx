'use client';

import {
  PortalSidebar,
  tutorNavigation,
} from '@/shared/components/portal-sidebar';

export interface TutorSidebarProps {
  mobileOnly?: boolean;
  asAside?: boolean;
}

export function TutorSidebar(props: TutorSidebarProps) {
  return <PortalSidebar config={tutorNavigation} {...props} />;
}
