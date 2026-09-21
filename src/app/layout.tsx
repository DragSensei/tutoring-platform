import type { Metadata } from 'next';
import './globals.css';
import { RootShell } from './_components/root-shell';
import { getSession } from '@/features/auth/server/session';

export const metadata: Metadata = {
  title: 'Big Hero Robotics Academy | STEM & Coding Platform',
  description: 'Hands-on robotics, coding, and STEM tutoring for kids and teens with automated Gadwal timetables and student wallets.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-red-600 selection:text-white">
        <RootShell session={session}>{children}</RootShell>
      </body>
    </html>
  );
}

