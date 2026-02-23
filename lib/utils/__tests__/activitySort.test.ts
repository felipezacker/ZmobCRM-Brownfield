import { describe, it, expect } from 'vitest';
import { sortActivitiesSmart } from '../activitySort';

const makeActivity = (id: string, dateStr: string) => ({
  id,
  date: dateStr,
  type: 'TASK' as const,
  title: `Activity ${id}`,
  dealId: 'd1',
  organizationId: 'org1',
  createdBy: 'user1',
  createdAt: dateStr,
  updatedAt: dateStr,
  completed: false,
});

describe('sortActivitiesSmart', () => {
  it('returns empty for empty input', () => {
    expect(sortActivitiesSmart([])).toEqual([]);
  });

  it('puts overdue before today before future', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const today = new Date();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activities = [
      makeActivity('future', tomorrow.toISOString()),
      makeActivity('today', today.toISOString()),
      makeActivity('overdue', yesterday.toISOString()),
    ];

    const sorted = sortActivitiesSmart(activities as any);
    expect(sorted[0].id).toBe('overdue');
    expect(sorted[1].id).toBe('today');
    expect(sorted[2].id).toBe('future');
  });

  it('handles activities with null/invalid dates (treats as Invalid Date)', () => {
    const validDate = new Date();
    validDate.setDate(validDate.getDate() - 1);

    const activities = [
      makeActivity('valid', validDate.toISOString()),
      makeActivity('nullDate', null as any),
      makeActivity('invalidDate', 'not-a-date'),
    ];

    // Should not throw
    const sorted = sortActivitiesSmart(activities as any);
    expect(sorted).toHaveLength(3);
    // Valid activity should still be present
    expect(sorted.some(a => a.id === 'valid')).toBe(true);
  });

  it('sorts overdue by oldest first', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const activities = [
      makeActivity('yesterday', yesterday.toISOString()),
      makeActivity('twoDaysAgo', twoDaysAgo.toISOString()),
    ];

    const sorted = sortActivitiesSmart(activities as any);
    expect(sorted[0].id).toBe('twoDaysAgo');
    expect(sorted[1].id).toBe('yesterday');
  });
});
