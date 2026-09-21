import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

const usePathname = vi.fn();
vi.mock('next/navigation', () => ({ usePathname }));

const { RootShell } = await import('@/app/_components/root-shell');

describe('RootShell session continuity', () => {
  it('shows a role-aware Dashboard action on the public site for an authenticated user', () => {
    usePathname.mockReturnValue('/');
    const html = renderToString(
      <RootShell session={{ userId: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN' }}>
        <p>Public content</p>
      </RootShell>
    );

    expect(html).toContain('Dashboard');
    expect(html).not.toContain('Sign In');
    expect(html).toContain('href="/admin"');
  });

  it('does not render the public navbar inside a tutor portal route', () => {
    usePathname.mockReturnValue('/tutor/agenda');
    const html = renderToString(
      <RootShell session={{ userId: 'tutor-1', email: 'tutor@example.com', name: 'Tutor', role: 'TUTOR' }}>
        <p>Tutor content</p>
      </RootShell>
    );

    expect(html).toContain('Tutor content');
    expect(html).not.toContain('About Us');
    expect(html).not.toContain('Sign In');
  });
});
