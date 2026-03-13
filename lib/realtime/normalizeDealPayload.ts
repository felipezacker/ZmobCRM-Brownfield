/** Normalize Supabase Realtime snake_case payload to app camelCase format */
export function normalizeDealPayload(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };

  const snakeToCamel: Array<[string, string]> = [
    ['stage_id', 'status'],
    ['updated_at', 'updatedAt'],
    ['created_at', 'createdAt'],
    ['is_won', 'isWon'],
    ['is_lost', 'isLost'],
    ['board_id', 'boardId'],
    ['contact_id', 'contactId'],
    ['closed_at', 'closedAt'],
    ['last_stage_change_date', 'lastStageChangeDate'],
    ['organization_id', 'organizationId'],
    ['loss_reason', 'lossReason'],
    ['owner_id', 'ownerId'],
  ];

  for (const [snake, camel] of snakeToCamel) {
    if (result[snake] !== undefined) {
      // Propagate value including null — null means field was explicitly cleared (e.g., board removed)
      // Absent fields (undefined) are intentionally skipped to avoid overwriting enriched cache data
      result[camel] = result[snake];
      delete result[snake];
    }
  }

  return result;
}
