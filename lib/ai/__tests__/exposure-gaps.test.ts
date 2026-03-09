import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDealTools } from '../tools/deal-tools';
import { createActivityTools } from '../tools/activity-tools';
import { createContactTools } from '../tools/contact-tools';
import type { ToolContext } from '../tools/types';

/**
 * Tests for exposure gaps fixed in TD-2.2:
 * - AC9: property_ref in deal tools
 * - AC10: metadata in activity tools
 * - AC13/AC14: tags/custom_fields in contact tools
 */

function createMockSupabase(overrides: Record<string, unknown> = {}) {
    const defaultResult = { data: [], error: null };

    const chainable: Record<string, any> = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(overrides.single ?? defaultResult),
        maybeSingle: vi.fn().mockResolvedValue(overrides.maybeSingle ?? defaultResult),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
    };

    const thenHandler = overrides.then ?? (() => Promise.resolve(overrides.queryResult ?? defaultResult));
    Object.defineProperty(chainable, 'then', {
        value: (resolve: (v: unknown) => void) => (thenHandler as () => Promise<unknown>)().then(resolve),
        writable: true,
    });

    return {
        from: vi.fn().mockReturnValue(chainable),
        _chain: chainable,
    };
}

function makeToolContext(supabase: any): ToolContext {
    return {
        supabase,
        organizationId: 'org-test',
        context: { organizationId: 'org-test', boardId: 'board-1' } as any,
        userId: 'user-1',
        bypassApproval: true,
    };
}

describe('Deal tools - property_ref exposure (AC9)', () => {
    it('getDealDetails includes propertyRef in response', async () => {
        const mockDeal = {
            id: 'd1',
            title: 'Test Deal',
            value: 50000,
            is_won: false,
            is_lost: false,
            priority: 'high',
            property_ref: 'AP-301-BLOCO-B',
            created_at: '2026-03-07',
            stage: { name: 'Proposta', label: 'Proposta' },
            contact: { name: 'Maria', email: 'maria@test.com', phone: '11999' },
            activities: [],
        };

        const supabase = createMockSupabase({
            single: { data: mockDeal, error: null },
        });
        const tools = createDealTools(makeToolContext(supabase));

        const result = await (tools.getDealDetails as any).execute({ dealId: 'd1' });
        expect(result.propertyRef).toBe('AP-301-BLOCO-B');
    });

    it('getDealDetails returns null propertyRef when not set', async () => {
        const mockDeal = {
            id: 'd2',
            title: 'Deal sem ref',
            value: 0,
            is_won: false,
            is_lost: false,
            priority: 'medium',
            property_ref: null,
            created_at: '2026-03-07',
            stage: { name: 'Descoberta' },
            contact: { name: 'Test' },
            activities: [],
        };

        const supabase = createMockSupabase({
            single: { data: mockDeal, error: null },
        });
        const tools = createDealTools(makeToolContext(supabase));

        const result = await (tools.getDealDetails as any).execute({ dealId: 'd2' });
        expect(result.propertyRef).toBeNull();
    });

    it('searchDeals includes propertyRef in results', async () => {
        const mockDeals = [
            {
                id: 'd1',
                title: 'Deal A',
                value: 1000,
                is_won: false,
                is_lost: false,
                property_ref: 'REF-123',
                stage: { name: 'Proposta' },
                contact: { name: 'Client' },
            },
        ];

        const supabase = createMockSupabase({
            queryResult: { data: mockDeals, error: null },
        });
        // Need board guard to pass
        const chain = (supabase as any)._chain;
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'board-1' }, error: null });

        const tools = createDealTools(makeToolContext(supabase));
        const result = await (tools.searchDeals as any).execute({ query: 'Deal', limit: 5 });
        expect(result.deals[0].propertyRef).toBe('REF-123');
    });
});

describe('Activity tools - metadata exposure (AC10)', () => {
    it('listActivities includes metadata in response', async () => {
        const mockActivities = [
            {
                id: 'a1',
                title: 'Ligacao para Maria',
                type: 'CALL',
                date: '2026-03-07T10:00:00Z',
                completed: true,
                metadata: { outcome: 'connected', duration_seconds: 180 },
                deal_id: 'd1',
                contact_id: 'c1',
                deals: { title: 'Deal Test', board_id: 'board-1' },
                contact: { name: 'Maria' },
            },
        ];

        const supabase = createMockSupabase({
            queryResult: { data: mockActivities, error: null },
        });
        // Board guard
        const chain = (supabase as any)._chain;
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'board-1' }, error: null });

        const tools = createActivityTools(makeToolContext(supabase));
        const result = await (tools.listActivities as any).execute({ limit: 10 });
        expect(result.activities[0].metadata).toEqual({ outcome: 'connected', duration_seconds: 180 });
    });

    it('listActivities returns null metadata when not present', async () => {
        const mockActivities = [
            {
                id: 'a2',
                title: 'Task',
                type: 'TASK',
                date: '2026-03-07',
                completed: false,
                metadata: null,
                deal_id: null,
                contact_id: null,
                deals: null,
                contact: null,
            },
        ];

        const supabase = createMockSupabase({
            queryResult: { data: mockActivities, error: null },
        });

        const tools = createActivityTools(makeToolContext(supabase));
        const result = await (tools.listActivities as any).execute({ limit: 10 });
        expect(result.activities[0].metadata).toBeNull();
    });
});

describe('Contact tools - tags and custom_fields (AC13/AC14)', () => {
    it('searchContacts accepts tag filter', async () => {
        const mockContacts = [
            {
                id: 'c1',
                name: 'VIP Client',
                email: 'vip@test.com',
                phone: '555',
                tags: ['VIP', 'Indicacao'],
                custom_fields: { origem: 'indicacao' },
            },
        ];

        const supabase = createMockSupabase({
            queryResult: { data: mockContacts, error: null },
        });

        const tools = createContactTools(makeToolContext(supabase));
        const result = await (tools.searchContacts as any).execute({
            query: 'VIP',
            tag: 'VIP',
            limit: 5,
        });

        expect(result.contacts[0].tags).toEqual(['VIP', 'Indicacao']);
        expect(result.contacts[0].customFields).toEqual({ origem: 'indicacao' });
        // Verify contains was called for tag filtering
        expect((supabase as any)._chain.contains).toHaveBeenCalledWith('tags', ['VIP']);
    });

    it('searchContacts accepts customFieldKey/customFieldValue filter', async () => {
        const mockContacts = [
            {
                id: 'c2',
                name: 'Referral Client',
                email: 'ref@test.com',
                phone: null,
                tags: [],
                custom_fields: { origem: 'indicacao' },
            },
        ];

        const supabase = createMockSupabase({
            queryResult: { data: mockContacts, error: null },
        });

        const tools = createContactTools(makeToolContext(supabase));
        const result = await (tools.searchContacts as any).execute({
            query: 'Referral',
            customFieldKey: 'origem',
            customFieldValue: 'indicacao',
            limit: 5,
        });

        expect(result.contacts[0].customFields).toEqual({ origem: 'indicacao' });
        // Verify contains was called for custom field filtering
        expect((supabase as any)._chain.contains).toHaveBeenCalledWith('custom_fields', { origem: 'indicacao' });
    });

    it('getContactDetails includes tags and customFields', async () => {
        const mockContact = {
            id: 'c3',
            name: 'Full Contact',
            email: 'full@test.com',
            phone: '999',
            notes: 'Test',
            status: 'ACTIVE',
            stage: 'LEAD',
            source: 'website',
            tags: ['Premium'],
            custom_fields: { segmento: 'enterprise' },
            created_at: '2026-01-01',
            updated_at: '2026-03-07',
        };

        const supabase = createMockSupabase({
            maybeSingle: { data: mockContact, error: null },
        });

        const tools = createContactTools(makeToolContext(supabase));
        const result = await (tools.getContactDetails as any).execute({ contactId: 'c3' });

        expect(result.tags).toEqual(['Premium']);
        expect(result.customFields).toEqual({ segmento: 'enterprise' });
    });
});
