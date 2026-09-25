export interface DestructiveHoldState {
  startedAt: number | null;
  complete: boolean;
}

export const EMPTY_DESTRUCTIVE_HOLD: DestructiveHoldState = { startedAt: null, complete: false };
export const DESTRUCTIVE_HOLD_MS = 4_000;

export function beginDestructiveHold(now: number): DestructiveHoldState {
  return { startedAt: now, complete: false };
}

export function canStartDestructiveHold(state: DestructiveHoldState): boolean {
  return state.startedAt === null && !state.complete;
}

export function resetDestructiveHold(): DestructiveHoldState {
  return EMPTY_DESTRUCTIVE_HOLD;
}

export function finishDestructiveHold(state: DestructiveHoldState, now: number): DestructiveHoldState {
  if (state.startedAt === null || now - state.startedAt < DESTRUCTIVE_HOLD_MS) return EMPTY_DESTRUCTIVE_HOLD;
  return { startedAt: null, complete: true };
}

export function canConfirmDestructiveDelete(canDelete: boolean, holdComplete: boolean, phrase: string): boolean {
  return canDelete && holdComplete && phrase === 'delete-this-account';
}
