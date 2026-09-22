import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const finalizeDueAttendance = vi.fn();
const getPlatformPolicies = vi.fn();

vi.mock('@/features/attendance/server/finalize-due-attendance', () => ({ finalizeDueAttendance }));
vi.mock('@/features/policies/server/policy-actions', () => ({ getPlatformPolicies }));

const { POST } = await import('@/app/api/internal/attendance/finalize/route');

function request(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/internal/attendance/finalize', { method: 'POST', headers });
}

describe('attendance finalizer trigger', () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    vi.clearAllMocks();
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it('fails closed when the scheduler secret is not configured', async () => {
    delete process.env.CRON_SECRET;

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(finalizeDueAttendance).not.toHaveBeenCalled();
  });

  it('rejects an invalid scheduler secret', async () => {
    process.env.CRON_SECRET = 'expected-secret';

    const response = await POST(request({ 'x-cron-secret': 'wrong-secret' }));

    expect(response.status).toBe(401);
    expect(finalizeDueAttendance).not.toHaveBeenCalled();
  });

  it('rejects raw and non-Bearer Authorization values', async () => {
    process.env.CRON_SECRET = 'expected-secret';

    const rawResponse = await POST(request({ authorization: 'expected-secret' }));
    const basicResponse = await POST(request({ authorization: 'Basic expected-secret' }));

    expect(rawResponse.status).toBe(401);
    expect(basicResponse.status).toBe(401);
    expect(finalizeDueAttendance).not.toHaveBeenCalled();
  });

  it('rejects a wrong-length secret without throwing', async () => {
    process.env.CRON_SECRET = 'expected-secret';

    await expect(POST(request({ authorization: 'Bearer short' }))).resolves.toMatchObject({ status: 401 });
    expect(finalizeDueAttendance).not.toHaveBeenCalled();
  });

  it('runs the canonical finalizer for a valid Bearer secret', async () => {
    process.env.CRON_SECRET = 'expected-secret';
    getPlatformPolicies.mockResolvedValue({ checkInWindowHours: 4, groupSessionPrice: 375, privateSessionPrice: 500 });
    finalizeDueAttendance.mockResolvedValue({ dueCount: 2, finalizedCount: 2 });

    const response = await POST(request({ authorization: 'Bearer expected-secret' }));

    expect(response.status).toBe(200);
    expect(finalizeDueAttendance).toHaveBeenCalledWith({ checkInWindowHours: 4, groupSessionPrice: 375, privateSessionPrice: 500 });
    await expect(response.json()).resolves.toEqual({ dueCount: 2, finalizedCount: 2 });
  });

  it('accepts the documented x-cron-secret header', async () => {
    process.env.CRON_SECRET = 'expected-secret';
    getPlatformPolicies.mockResolvedValue({ checkInWindowHours: 4, groupSessionPrice: 375, privateSessionPrice: 500 });
    finalizeDueAttendance.mockResolvedValue({ dueCount: 0, finalizedCount: 0 });

    const response = await POST(request({ 'x-cron-secret': 'expected-secret' }));

    expect(response.status).toBe(200);
    expect(finalizeDueAttendance).toHaveBeenCalledTimes(1);
  });
});
