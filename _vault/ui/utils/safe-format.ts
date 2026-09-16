/**
 * Deterministic date and time formatters that guarantee identical
 * output across Node.js server runtimes and client browsers.
 */
export function formatDeterministicDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "Invalid Date";

  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());

  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

export function formatCountdown(targetDateInput: string | Date, nowDateInput: string | Date = new Date()): {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  const target = typeof targetDateInput === "string" ? new Date(targetDateInput).getTime() : targetDateInput.getTime();
  const now = typeof nowDateInput === "string" ? new Date(nowDateInput).getTime() : nowDateInput.getTime();
  const diffMs = target - now;

  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, isExpired: false };
}
