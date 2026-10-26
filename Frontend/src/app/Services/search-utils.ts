export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/ё/g, 'е');
}

export function matchesSearchText(
  source: string | null | undefined,
  query: string | null | undefined
): boolean {
  const normalizedQuery = normalizeSearchText(query).trim();

  if (!normalizedQuery) {
    return true;
  }

  return normalizeSearchText(source).includes(normalizedQuery);
}
