import { describe, expect, it } from 'vitest';
import { hasChangedDefaultStartTime, toDateTimeInputValue } from '@/app/(portal)/admin/gadwal/_components/session-form-utils';

describe('Admin session form safety confirmation', () => {
  it('only confirms the untouched create-time default', () => {
    expect(hasChangedDefaultStartTime(false)).toBe(false);
    expect(hasChangedDefaultStartTime(true)).toBe(true);
  });

  it('formats persisted dates for the local datetime input', () => {
    expect(toDateTimeInputValue('2026-10-01T10:00:00.000Z')).toMatch(/^2026-10-01T/);
  });
});
