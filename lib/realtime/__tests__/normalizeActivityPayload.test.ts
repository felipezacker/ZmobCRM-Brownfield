import { describe, it, expect } from 'vitest';
import { normalizeActivityPayload } from '../normalizeActivityPayload';

describe('normalizeActivityPayload', () => {
  it('converts deal_id to dealId', () => {
    const result = normalizeActivityPayload({ id: 'a-1', deal_id: 'deal-1' });

    expect(result).toHaveProperty('dealId', 'deal-1');
    expect(result).not.toHaveProperty('deal_id');
  });

  it('converts deal_id: null to dealId: null', () => {
    const result = normalizeActivityPayload({ id: 'a-1', deal_id: null });

    expect(result).toHaveProperty('dealId', null);
    expect(result).not.toHaveProperty('deal_id');
  });

  it('does not add dealId when deal_id is absent from payload', () => {
    const result = normalizeActivityPayload({ id: 'a-1', title: 'Test' });

    expect(result).not.toHaveProperty('dealId');
    expect(result).not.toHaveProperty('deal_id');
  });

  it('preserves fields not in snakeToCamel map', () => {
    const result = normalizeActivityPayload({ id: 'a-1', title: 'Call', type: 'CALL', completed: false });

    expect(result.id).toBe('a-1');
    expect(result.title).toBe('Call');
    expect(result.type).toBe('CALL');
    expect(result.completed).toBe(false);
  });

  it('overwrites camelCase key when snake_case is present in payload', () => {
    const result = normalizeActivityPayload({ contact_id: 'new', contactId: 'old' });

    expect(result.contactId).toBe('new');
    expect(result).not.toHaveProperty('contact_id');
  });

  describe('all mapped fields propagate null correctly', () => {
    const snakeToCamelPairs: Array<[string, string]> = [
      ['deal_id', 'dealId'],
      ['contact_id', 'contactId'],
      ['organization_id', 'organizationId'],
      ['deal_title', 'dealTitle'],
      ['recurrence_type', 'recurrenceType'],
      ['recurrence_end_date', 'recurrenceEndDate'],
      ['participant_contact_ids', 'participantContactIds'],
      ['updated_at', 'updatedAt'],
      ['created_at', 'createdAt'],
    ];

    for (const [snake, camel] of snakeToCamelPairs) {
      it(`propagates null for ${snake} → ${camel}`, () => {
        const result = normalizeActivityPayload({ id: 'a-1', [snake]: null });

        expect(result).toHaveProperty(camel, null);
        expect(result).not.toHaveProperty(snake);
      });
    }
  });

  it('handles multiple snake_case fields in single payload', () => {
    const result = normalizeActivityPayload({
      id: 'a-1',
      deal_id: 'deal-1',
      contact_id: null,
      organization_id: 'org-1',
      deal_title: 'My Deal',
      recurrence_type: 'weekly',
      recurrence_end_date: null,
      participant_contact_ids: ['c-1', 'c-2'],
      updated_at: '2026-03-13T10:00:00Z',
      created_at: '2026-03-12T08:00:00Z',
    });

    expect(result.dealId).toBe('deal-1');
    expect(result.contactId).toBeNull();
    expect(result.organizationId).toBe('org-1');
    expect(result.dealTitle).toBe('My Deal');
    expect(result.recurrenceType).toBe('weekly');
    expect(result.recurrenceEndDate).toBeNull();
    expect(result.participantContactIds).toEqual(['c-1', 'c-2']);
    expect(result.updatedAt).toBe('2026-03-13T10:00:00Z');
    expect(result.createdAt).toBe('2026-03-12T08:00:00Z');
    // No snake_case keys remain
    expect(result).not.toHaveProperty('deal_id');
    expect(result).not.toHaveProperty('contact_id');
    expect(result).not.toHaveProperty('organization_id');
    expect(result).not.toHaveProperty('deal_title');
    expect(result).not.toHaveProperty('recurrence_type');
    expect(result).not.toHaveProperty('recurrence_end_date');
    expect(result).not.toHaveProperty('participant_contact_ids');
    expect(result).not.toHaveProperty('updated_at');
    expect(result).not.toHaveProperty('created_at');
  });
});
