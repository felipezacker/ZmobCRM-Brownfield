import { describe, it, expect } from 'vitest';
import { normalizeDealPayload } from '../normalizeDealPayload';

describe('normalizeDealPayload', () => {
  it('converts board_id: null to boardId: null (AC1)', () => {
    const result = normalizeDealPayload({ id: 'deal-1', board_id: null });

    expect(result).toHaveProperty('boardId', null);
    expect(result).not.toHaveProperty('board_id');
  });

  it('does not add boardId when board_id is absent from payload (AC3)', () => {
    const result = normalizeDealPayload({ id: 'deal-1', title: 'Test' });

    expect(result).not.toHaveProperty('boardId');
    expect(result).not.toHaveProperty('board_id');
  });

  it('converts board_id with value to boardId (AC4)', () => {
    const result = normalizeDealPayload({ id: 'deal-1', board_id: 'board-1' });

    expect(result).toHaveProperty('boardId', 'board-1');
    expect(result).not.toHaveProperty('board_id');
  });

  it('converts stage_id to status', () => {
    const result = normalizeDealPayload({ id: 'deal-1', stage_id: 'stage-a' });

    expect(result).toHaveProperty('status', 'stage-a');
    expect(result).not.toHaveProperty('stage_id');
  });

  it('preserves fields not in snakeToCamel map', () => {
    const result = normalizeDealPayload({ id: 'deal-1', title: 'My Deal', value: 500 });

    expect(result.id).toBe('deal-1');
    expect(result.title).toBe('My Deal');
    expect(result.value).toBe(500);
  });

  it('overwrites camelCase key when snake_case is present in payload', () => {
    const result = normalizeDealPayload({ board_id: 'board-2', boardId: 'board-old' });

    expect(result.boardId).toBe('board-2');
    expect(result).not.toHaveProperty('board_id');
  });

  describe('AC5 — all mapped fields propagate null correctly', () => {
    const snakeToCamelPairs: Array<[string, string]> = [
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

    for (const [snake, camel] of snakeToCamelPairs) {
      it(`propagates null for ${snake} → ${camel}`, () => {
        const result = normalizeDealPayload({ id: 'deal-1', [snake]: null });

        expect(result).toHaveProperty(camel, null);
        expect(result).not.toHaveProperty(snake);
      });
    }
  });

  it('handles multiple snake_case fields in single payload', () => {
    const result = normalizeDealPayload({
      id: 'deal-1',
      board_id: null,
      stage_id: 'stage-b',
      owner_id: 'user-2',
      contact_id: null,
    });

    expect(result.boardId).toBeNull();
    expect(result.status).toBe('stage-b');
    expect(result.ownerId).toBe('user-2');
    expect(result.contactId).toBeNull();
    expect(result).not.toHaveProperty('board_id');
    expect(result).not.toHaveProperty('stage_id');
    expect(result).not.toHaveProperty('owner_id');
    expect(result).not.toHaveProperty('contact_id');
  });
});
