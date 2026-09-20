export function matchesTableSearch(values: Array<string | number | null | undefined>, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  return values.some((value) => String(value ?? '').toLocaleLowerCase().includes(normalizedQuery));
}
