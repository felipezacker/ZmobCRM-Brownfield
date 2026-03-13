/** Normalize Supabase Realtime snake_case payload to app camelCase format for Activity */
export function normalizeActivityPayload(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };

  const snakeToCamel: Array<[string, string]> = [
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

  for (const [snake, camel] of snakeToCamel) {
    if (result[snake] !== undefined) {
      result[camel] = result[snake];
      delete result[snake];
    }
  }

  return result;
}
