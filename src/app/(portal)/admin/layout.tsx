import * as React from 'react';
import { AdminSidebar } from './_components/admin-sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
      <div className="flex flex-col md:flex-row items-start gap-6 lg:gap-8">
        <aside className="w-full md:w-64 shrink-0 md:sticky md:top-20">
          <AdminSidebar />
        </aside>
        <main className="min-w-0 flex-1 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
