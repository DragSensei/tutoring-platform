import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MonthlyReceivableHistory } from '@/app/(portal)/admin/accounts/[id]/_components/monthly-receivable-history';

describe('monthly receivable history', () => {
  it('renders the stored period and immutable amount snapshots without payment language', () => {
    const html = renderToStaticMarkup(<MonthlyReceivableHistory items={[{
      id: 'receivable-1', periodStart: '2026-03-01', periodEnd: '2026-04-01', enrollmentLabel: 'GROUP',
      baseMonthlyPriceSnapshot: 1500, linkedDiscountSnapshot: 100, expectedDueSnapshot: 1400,
      generatedAt: '2026-03-02T10:30:00.000Z',
    }]} />);

    expect(html).toContain('2026-03-01');
    expect(html).toContain('2026-04-01');
    expect(html).toContain('GROUP');
    expect(html).toContain('Base monthly price');
    expect(html).toContain('Linked discount');
    expect(html).toContain('Expected due');
    expect(html).toContain('1,500.00 EGP');
    expect(html).toContain('−100.00 EGP');
    expect(html).toContain('1,400.00 EGP');
    expect(html).toContain('Generated 2026-03-02T10:30:00.000Z');
    expect(html).not.toMatch(/paid|collected/i);
  });
});
