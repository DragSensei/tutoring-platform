import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { hasPortalAccess } from '../_components/protected-portal';
import { StudentPortalShell } from './_components/student-portal-shell';

export default async function StudentLayout({ children }: { children: ReactNode }) {
  if (!await hasPortalAccess('STUDENT')) notFound();
  return <StudentPortalShell>{children}</StudentPortalShell>;
}
