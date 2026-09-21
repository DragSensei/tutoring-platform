export function hasChangedDefaultStartTime(hasEditedStartTime: boolean): boolean {
  return hasEditedStartTime;
}

export function toDateTimeInputValue(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
