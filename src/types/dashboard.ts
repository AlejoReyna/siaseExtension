export type DashboardSectionId =
  | 'upcoming-activities'
  | 'key-metrics'
  | 'recent-grades'
  | 'official-notices';

export const DEFAULT_DASHBOARD_SECTION_ORDER: DashboardSectionId[] = [
  'upcoming-activities',
  'key-metrics',
  'recent-grades',
  'official-notices'
];

export function normalizeDashboardSectionOrder(
  value: unknown
): DashboardSectionId[] {
  const valid = new Set<string>(DEFAULT_DASHBOARD_SECTION_ORDER);
  const normalized = Array.isArray(value)
    ? value.filter(
        (id, index, items): id is DashboardSectionId =>
          typeof id === 'string' &&
          valid.has(id) &&
          id !== 'academic-activity' &&
          items.indexOf(id) === index
      )
    : [];

  DEFAULT_DASHBOARD_SECTION_ORDER.forEach((id) => {
    if (!normalized.includes(id)) normalized.push(id);
  });
  return normalized;
}
