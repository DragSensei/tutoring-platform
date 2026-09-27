export function formatRecoveryTimeRemaining(closesAt: string, now: number | Date): string {
  const currentTime = now instanceof Date ? now.getTime() : now;
  const remainingMs = Math.max(0, new Date(closesAt).getTime() - currentTime);
  const remainingMinutes = Math.ceil(remainingMs / 60_000);
  if (remainingMinutes < 60) return `${remainingMinutes} min remaining`;

  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  return `${hours} hr${hours === 1 ? '' : 's'}${minutes ? ` ${minutes} min` : ''} remaining`;
}

export function isRecoveryWindowActive(
  grant: { openedAt: string; closesAt: string } | null | undefined,
  now: number | Date,
): boolean {
  if (!grant) return false;
  const currentTime = now instanceof Date ? now.getTime() : now;
  return currentTime >= new Date(grant.openedAt).getTime()
    && currentTime <= new Date(grant.closesAt).getTime();
}
