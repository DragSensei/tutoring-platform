import { describe, expect, it } from 'vitest';
import { beginDestructiveHold, canConfirmDestructiveDelete, canStartDestructiveHold, EMPTY_DESTRUCTIVE_HOLD, finishDestructiveHold, resetDestructiveHold } from '@/features/accounts/domain/destructive-hold';

describe('permanent-delete hold interaction', () => {
  it('resets progress after early release and a quick click cannot complete it', () => {
    const pressed = beginDestructiveHold(10_000);
    expect(finishDestructiveHold(pressed, 10_001)).toEqual(EMPTY_DESTRUCTIVE_HOLD);
    expect(finishDestructiveHold(beginDestructiveHold(20_000), 20_100)).toEqual(EMPTY_DESTRUCTIVE_HOLD);
  });

  it('allows keyboard Space or Enter holds to complete after the full four seconds', () => {
    const keyboardPress = beginDestructiveHold(30_000);
    expect(finishDestructiveHold(keyboardPress, 33_999)).toEqual(EMPTY_DESTRUCTIVE_HOLD);
    expect(finishDestructiveHold(beginDestructiveHold(40_000), 44_000)).toEqual({ startedAt: null, complete: true });
  });

  it('enables final deletion only with the exact phrase and every preceding guard complete', () => {
    expect(canConfirmDestructiveDelete(true, true, 'delete-this-account')).toBe(true);
    expect(canConfirmDestructiveDelete(true, true, 'Delete-this-account')).toBe(false);
    expect(canConfirmDestructiveDelete(true, false, 'delete-this-account')).toBe(false);
    expect(canConfirmDestructiveDelete(false, true, 'delete-this-account')).toBe(false);
  });

  it('cancels an in-progress hold on close and requires a fresh hold after reopening', () => {
    const firstPress = beginDestructiveHold(50_000);
    expect(canStartDestructiveHold(firstPress)).toBe(false);
    const afterClose = resetDestructiveHold();
    expect(afterClose).toEqual(EMPTY_DESTRUCTIVE_HOLD);
    expect(canStartDestructiveHold(afterClose)).toBe(true);

    const reopenedPress = beginDestructiveHold(60_000);
    expect(finishDestructiveHold(reopenedPress, 63_999)).toEqual(EMPTY_DESTRUCTIVE_HOLD);
    expect(finishDestructiveHold(reopenedPress, 64_000)).toEqual({ startedAt: null, complete: true });
  });
});
