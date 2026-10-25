import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { formatEGP } from '@/shared/utils/currency';
import { AdminFinancesView } from '../../src/app/(portal)/admin/finances/_components/admin-finances-view';

beforeAll(() => vi.stubGlobal('React', React));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('../../src/app/(portal)/admin/finances/_components/finance-date-range-form', () => ({
  FinanceDateRangeForm: ({ from, to }: { from: string; to: string }) => (
    React.createElement('div', null,
      React.createElement('label', null, 'From', React.createElement('input', { value: from, readOnly: true })),
      React.createElement('label', null, 'To', React.createElement('input', { value: to, readOnly: true })),
    )
  ),
}));

vi.mock('../../src/app/(portal)/admin/finances/_components/payout-form', () => ({
  PayoutForm: () => React.createElement('form', { 'aria-label': 'Record payout' },
    React.createElement('button', { type: 'button' }, 'Record payout')),
}));

type Report = Parameters<typeof AdminFinancesView>[0]['report'];

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    range: { from: '2025-03-04', to: '2025-03-19', month: '', cycleMonth: '2025-03', cycleUntilLabel: '2025-04-22' },
    summary: {
      deliveredMinutes: 210,
      compensatedMinutes: 210,
      tutorCompensation: '2400.00',
      commission: '0.00',
      lifetimeTutorOutstanding: '4200.00',
      lifetimeSalesOutstanding: '0.00',
      negativeOutstandingCount: 0,
      systemTrackedCharges: '0.00',
      unaccruedMinutes: 60,
      unaccruedSessionCount: 1,
      needsRateReviewMinutes: 60,
      needsRateReviewCount: 1,
    },
    policy: {
      defaultTutorHourlyRate: '0.00',
      commissionEnabled: false,
      commissionBasis: 'FINALIZED_SESSION_WALLET_CHARGE',
      commissionRateBps: 0,
      commissionRuleVersion: 1,
      commissionUpdatedBy: null,
      commissionUpdatedAt: null,
    },
    unaccrued: [{
      sessionId: 'review-session', title: 'Unrated session', tutorName: 'Mina Tutor',
      startTime: '2025-03-10T10:00:00.000Z', finalizedAt: '2025-03-10T11:00:00.000Z',
      deliveredMinutes: 60, effectiveRate: '0.00', needsRateReview: true,
    }],
    compensation: [
      { id: 'entry-120', sessionId: 'session-120', tutorId: 'tutor-1', tutorName: 'Mina Tutor', deliveredMinutes: 120, hourlyRate: '800.00', amount: '1600.00', createdAt: '2025-03-18T12:00:00.000Z' },
      { id: 'entry-60', sessionId: 'session-60', tutorId: 'tutor-1', tutorName: 'Mina Tutor', deliveredMinutes: 60, hourlyRate: '700.00', amount: '700.00', createdAt: '2025-03-17T12:00:00.000Z' },
      { id: 'entry-30', sessionId: 'session-30', tutorId: 'tutor-1', tutorName: 'Mina Tutor', deliveredMinutes: 30, hourlyRate: '200.00', amount: '100.00', createdAt: '2025-03-16T12:00:00.000Z' },
    ],
    tutorPayables: [{ id: 'tutor-1', name: 'Mina Tutor', earned: '5000.00', paid: '800.00', outstanding: '4200.00', deliveredMinutes: 360, sessionCount: 3 }],
    salesPayables: [],
    payouts: [],
    payoutCount: 0,
    commissions: [],
    charges: [],
    displayedRows: { compensation: 3, commissions: 0, charges: 0, limit: 200 },
    ...overrides,
  } as Report;
}

function render(report = makeReport()) {
  return renderToStaticMarkup(React.createElement(AdminFinancesView, { report }));
}

describe('Admin finances presentation', () => {
  it('labels custom dates as an activity period and separates period figures from lifetime balances', () => {
    const html = render();

    expect(html).toContain('Selected activity period · 2025-03-04 to 2025-03-19');
    expect(html).toContain('Lifetime totals.');
    expect(html).toContain(formatEGP('5000.00'));
    expect(html).toContain(formatEGP('2400.00'));
    expect(html).toContain('3 compensated sessions');
    expect(html).toContain('aria-label="Selected activity totals"');
    expect(html).not.toContain('aria-label="Selected cycle totals"');
    expect(html).not.toMatch(/<h[23][^>]*>Summary<\/h[23]>/);
  });

  it('shows each saved duration and rate for the same tutor, and identifies them as historical saved rates', () => {
    const html = render();

    for (const [minutes, rate] of [[120, '800.00'], [60, '700.00'], [30, '200.00']] as const) {
      expect(html).toContain(`${(minutes / 60).toFixed(1)} h × ${formatEGP(rate)} / hour`);
    }
    expect(html).toContain('Existing earnings keep their saved rates.');
    expect(html).toContain('Per-session saved rates are listed below.');
    expect(html.match(/Mina Tutor/g)).toBeTruthy();
  });

  it('does not guess a rate for an unrated session and exposes the rate review queue', () => {
    const html = render();

    expect(html).toContain('1.0 h need an hourly rate');
    expect(html).toContain('View rate and accrual review queue');
    expect(html).toContain('Rate needed');
    expect(html).not.toContain('Rate 0.00 EGP');
  });

  it('shows empty states while retaining payout and receivables access', () => {
    const empty = makeReport({
      compensation: [],
      tutorPayables: [],
      unaccrued: [],
      summary: {
        ...makeReport().summary,
        compensatedMinutes: 0,
        tutorCompensation: '0.00',
        unaccruedMinutes: 0,
        unaccruedSessionCount: 0,
        needsRateReviewMinutes: 0,
      },
    });
    const html = render(empty);

    expect(html).toContain('No finalized tutor hours have accrued.');
    expect(html).toContain('No compensation entries in this date range.');
    expect(html).toContain('Record payout');
    expect(html).toContain('href="/admin/finances/tutors"');
    expect(html).toContain('href="/admin/finances/receivables"');
  });
});
