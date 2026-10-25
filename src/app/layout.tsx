import type { Metadata } from 'next';
import './globals.css';
import { RootShell } from './_components/root-shell';
import { getSession } from '@/features/auth/server/session';
import { projectTheme, themeCssVariables } from '../../theme.config';
import type { CSSProperties } from 'react';

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
    <html lang="en" data-theme={projectTheme.ui.defaultMode} style={themeCssVariables() as CSSProperties}>
      <body className="antialiased min-h-screen flex flex-col bg-background text-text-primary font-sans selection:bg-brand-primary selection:text-white">
        <RootShell session={session}>{children}</RootShell>
      </body>
    </html>
  );
}

