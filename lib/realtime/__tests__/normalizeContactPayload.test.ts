import { describe, it, expect } from 'vitest';
import { normalizeContactPayload } from '../normalizeContactPayload';

describe('normalizeContactPayload', () => {
  it('converts organization_id to organizationId', () => {
    const result = normalizeContactPayload({ id: 'c-1', organization_id: 'org-1' });

    expect(result).toHaveProperty('organizationId', 'org-1');
    expect(result).not.toHaveProperty('organization_id');
  });

  it('converts owner_id: null to ownerId: null', () => {
    const result = normalizeContactPayload({ id: 'c-1', owner_id: null });

    expect(result).toHaveProperty('ownerId', null);
    expect(result).not.toHaveProperty('owner_id');
  });

  it('does not add camelCase key when snake_case is absent from payload', () => {
    const result = normalizeContactPayload({ id: 'c-1', name: 'Test' });

    expect(result).not.toHaveProperty('organizationId');
    expect(result).not.toHaveProperty('ownerId');
    expect(result).not.toHaveProperty('leadScore');
    expect(result.id).toBe('c-1');
    expect(result.name).toBe('Test');
  });

  it('preserves fields not in snakeToCamel map', () => {
    const result = normalizeContactPayload({ id: 'c-1', name: 'John', email: 'j@t.com', phone: '123', status: 'ACTIVE' });

    expect(result.id).toBe('c-1');
    expect(result.name).toBe('John');
    expect(result.email).toBe('j@t.com');
    expect(result.phone).toBe('123');
    expect(result.status).toBe('ACTIVE');
  });

  it('overwrites camelCase key when snake_case is present in payload', () => {
    const result = normalizeContactPayload({ owner_id: 'new-owner', ownerId: 'old-owner' });

    expect(result.ownerId).toBe('new-owner');
    expect(result).not.toHaveProperty('owner_id');
  });

  describe('all 15 mapped fields propagate null correctly', () => {
    const snakeToCamelPairs: Array<[string, string]> = [
      ['organization_id', 'organizationId'],
      ['owner_id', 'ownerId'],
      ['created_at', 'createdAt'],
      ['updated_at', 'updatedAt'],
      ['lead_score', 'leadScore'],
      ['contact_type', 'contactType'],
      ['address_cep', 'addressCep'],
      ['address_city', 'addressCity'],
      ['address_state', 'addressState'],
      ['profile_data', 'profileData'],
      ['last_interaction', 'lastInteraction'],
      ['birth_date', 'birthDate'],
      ['last_purchase_date', 'lastPurchaseDate'],
      ['total_value', 'totalValue'],
      ['custom_fields', 'customFields'],
    ];

    for (const [snake, camel] of snakeToCamelPairs) {
      it(`propagates null for ${snake} → ${camel}`, () => {
        const result = normalizeContactPayload({ id: 'c-1', [snake]: null });

        expect(result).toHaveProperty(camel, null);
        expect(result).not.toHaveProperty(snake);
      });
    }
  });

  it('handles multiple snake_case fields in single payload', () => {
    const result = normalizeContactPayload({
      id: 'c-1',
      owner_id: 'user-2',
      lead_score: 85,
      contact_type: 'PJ',
      address_city: 'Sao Paulo',
      total_value: 15000,
      custom_fields: { vip: true },
    });

    expect(result.ownerId).toBe('user-2');
    expect(result.leadScore).toBe(85);
    expect(result.contactType).toBe('PJ');
    expect(result.addressCity).toBe('Sao Paulo');
    expect(result.totalValue).toBe(15000);
    expect(result.customFields).toEqual({ vip: true });
    expect(result).not.toHaveProperty('owner_id');
    expect(result).not.toHaveProperty('lead_score');
    expect(result).not.toHaveProperty('contact_type');
    expect(result).not.toHaveProperty('address_city');
    expect(result).not.toHaveProperty('total_value');
    expect(result).not.toHaveProperty('custom_fields');
  });
});
