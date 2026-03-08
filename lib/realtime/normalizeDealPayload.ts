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
    if (result[snake] !== undefined && result[camel] === undefined) {
      result[camel] = result[snake];
      delete result[snake];
    }
  }

  return result;
}
