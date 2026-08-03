import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DASHBOARD_SECTION_ORDER,
  normalizeDashboardSectionOrder
} from '@/types/dashboard';

describe('normalizeDashboardSectionOrder', () => {
  it('uses the requested default order for a new installation', () => {
    expect(normalizeDashboardSectionOrder(undefined)).toEqual(
      DEFAULT_DASHBOARD_SECTION_ORDER
    );
  });

  it('preserves valid choices and appends missing sections', () => {
    expect(
      normalizeDashboardSectionOrder(['recent-grades', 'key-metrics'])
    ).toEqual([
      'recent-grades',
      'key-metrics',
      'upcoming-activities',
      'official-notices'
    ]);
  });

  it('removes legacy, invalid and repeated section IDs', () => {
    expect(
      normalizeDashboardSectionOrder([
        'academic-activity',
        'upcoming-activities',
        'invalid-section',
        'upcoming-activities',
        'official-notices'
      ])
    ).toEqual([
      'upcoming-activities',
      'official-notices',
      'key-metrics',
      'recent-grades'
    ]);
  });
});
