import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { hasPortalAccess } from '../_components/protected-portal';
import { TutorPortalShell } from './_components/tutor-portal-shell';

export default async function TutorLayout({ children }: { children: ReactNode }) {
  if (!await hasPortalAccess('TUTOR')) notFound();
  return <TutorPortalShell>{children}</TutorPortalShell>;
}
