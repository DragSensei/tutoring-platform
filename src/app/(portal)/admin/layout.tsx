import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { hasPortalAccess } from '../_components/protected-portal';
import { AdminPortalShell } from './_components/admin-portal-shell';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!await hasPortalAccess('ADMIN')) notFound();
  return <AdminPortalShell>{children}</AdminPortalShell>;
}
