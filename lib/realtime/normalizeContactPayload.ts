/** Normalize Supabase Realtime snake_case payload to app camelCase format for Contact */
export function normalizeContactPayload(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };

  const snakeToCamel: Array<[string, string]> = [
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

  for (const [snake, camel] of snakeToCamel) {
    if (result[snake] !== undefined) {
      // Propagate value including null — null means field was explicitly cleared
      // Absent fields (undefined) are intentionally skipped to avoid overwriting enriched cache data
      result[camel] = result[snake];
      delete result[snake];
    }
  }

  return result;
}
