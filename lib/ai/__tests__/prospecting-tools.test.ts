import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProspectingTools } from '../tools/prospecting-tools';
import type { ToolContext } from '../tools/types';

/**
 * Unit tests for prospecting AI tools (TD-2.2 / SYS-004 + SYS-012).
 *
 * These tests mock Supabase to verify tool behavior without a real DB.
 */

function createMockSupabase(overrides: Record<string, unknown> = {}) {
    const defaultResult = { data: [], error: null };

    const chainable: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(overrides.maybeSingle ?? defaultResult),
        single: vi.fn().mockResolvedValue(overrides.single ?? defaultResult),
        insert: vi.fn().mockReturnThis(),
        ...overrides,
    };

    // For the final resolution of the query chain (when no terminal is called),
    // make the chain itself thenable
    const thenHandler = overrides.then ?? (() => Promise.resolve(overrides.queryResult ?? defaultResult));
    Object.defineProperty(chainable, 'then', {
        value: (resolve: (v: unknown) => void) => (thenHandler as () => Promise<unknown>)().then(resolve),
        writable: true,
    });

    return {
        from: vi.fn().mockReturnValue(chainable),
        _chain: chainable,
    } as unknown as ToolContext['supabase'];
}

function makeToolContext(supabase: ToolContext['supabase']): ToolContext {
    return {
        supabase,
        organizationId: 'org-123',
        context: { organizationId: 'org-123' } as any,
        userId: 'user-456',
        bypassApproval: true,
    };
}

describe('createProspectingTools', () => {
    let supabase: ReturnType<typeof createMockSupabase>;
    let tools: ReturnType<typeof createProspectingTools>;

    beforeEach(() => {
        supabase = createMockSupabase();
        tools = createProspectingTools(makeToolContext(supabase as any));
    });

    describe('listProspectingQueues', () => {
        it('is defined and has execute', () => {
            expect(tools.listProspectingQueues).toBeDefined();
            expect((tools.listProspectingQueues as any).execute).toBeTypeOf('function');
        });

        it('calls supabase from prospecting_queues', async () => {
            const mockData = [
                {
                    id: 'q1',
                    contact_id: 'c1',
                    owner_id: 'user-456',
                    status: 'pending',
                    position: 0,
                    created_at: '2026-03-07T00:00:00Z',
                    contacts: { name: 'John', phone: '555-1234', email: 'john@test.com' },
                },
            ];

            supabase = createMockSupabase({
                queryResult: { data: mockData, error: null },
            });
            tools = createProspectingTools(makeToolContext(supabase as any));

            const result = await (tools.listProspectingQueues as any).execute({ limit: 20 });
            expect(result.count).toBe(1);
            expect(result.queue[0].contactName).toBe('John');
            expect(result.statusCounts.pending).toBe(1);
        });
    });

    describe('getProspectingMetrics', () => {
        it('is defined', () => {
            expect(tools.getProspectingMetrics).toBeDefined();
        });

        it('returns metrics with empty data', async () => {
            supabase = createMockSupabase({
                queryResult: { data: [], error: null },
            });
            tools = createProspectingTools(makeToolContext(supabase as any));

            const result = await (tools.getProspectingMetrics as any).execute({ period: 'today' });
            expect(result.totalCalls).toBe(0);
            expect(result.connectionRate).toBe('0%');
            expect(result.uniqueContacts).toBe(0);
        });

        it('calculates metrics correctly', async () => {
            const mockActivities = [
                { id: 'a1', date: '2026-03-07T10:00:00Z', owner_id: 'u1', contact_id: 'c1', metadata: { outcome: 'connected', duration_seconds: 120 } },
                { id: 'a2', date: '2026-03-07T11:00:00Z', owner_id: 'u1', contact_id: 'c2', metadata: { outcome: 'no_answer' } },
                { id: 'a3', date: '2026-03-07T12:00:00Z', owner_id: 'u1', contact_id: 'c1', metadata: { outcome: 'connected', duration_seconds: 60 } },
            ];

            supabase = createMockSupabase({
                queryResult: { data: mockActivities, error: null },
            });
            tools = createProspectingTools(makeToolContext(supabase as any));

            const result = await (tools.getProspectingMetrics as any).execute({ period: '7d' });
            expect(result.totalCalls).toBe(3);
            expect(result.connectedCalls).toBe(2);
            expect(result.connectionRate).toBe('67%');
            expect(result.avgDurationSeconds).toBe(90);
            expect(result.uniqueContacts).toBe(2);
            expect(result.byOutcome.connected).toBe(2);
            expect(result.byOutcome.no_answer).toBe(1);
        });
    });

    describe('getProspectingGoals', () => {
        it('is defined', () => {
            expect(tools.getProspectingGoals).toBeDefined();
        });

        it('returns default goal when no goal exists', async () => {
            supabase = createMockSupabase({
                maybeSingle: { data: null, error: null },
                queryResult: { data: null, error: null, count: 5 },
            });

            // Need a more precise mock since getProspectingGoals makes 2 queries
            const chainMaker = () => {
                let callCount = 0;
                const chain: Record<string, any> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                    is: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    maybeSingle: vi.fn().mockImplementation(() => {
                        return Promise.resolve({ data: null, error: null });
                    }),
                };
                Object.defineProperty(chain, 'then', {
                    value: (resolve: (v: unknown) => void) => {
                        callCount++;
                        return Promise.resolve({ data: null, error: null, count: 5 }).then(resolve);
                    },
                    writable: true,
                });
                return chain;
            };

            const mockSb = {
                from: vi.fn().mockImplementation(() => chainMaker()),
            };
            tools = createProspectingTools(makeToolContext(mockSb as any));

            const result = await (tools.getProspectingGoals as any).execute({});
            expect(result.target).toBe(30); // default
        });
    });

    describe('listQuickScripts', () => {
        it('is defined', () => {
            expect(tools.listQuickScripts).toBeDefined();
        });

        it('returns scripts filtered by category', async () => {
            const mockScripts = [
                { id: 's1', title: 'Follow-up padrao', category: 'followup', template: 'Ola...', icon: 'MessageSquare', is_system: true, created_at: '2026-03-01' },
            ];

            supabase = createMockSupabase({
                queryResult: { data: mockScripts, error: null },
            });
            tools = createProspectingTools(makeToolContext(supabase as any));

            const result = await (tools.listQuickScripts as any).execute({ category: 'followup', limit: 10 });
            expect(result.count).toBe(1);
            expect(result.scripts[0].title).toBe('Follow-up padrao');
            expect(result.scripts[0].category).toBe('followup');
        });
    });

    describe('createQuickScript', () => {
        it('is defined', () => {
            expect(tools.createQuickScript).toBeDefined();
        });

        it('inserts a new script', async () => {
            const insertedScript = { id: 's-new', title: 'Meu script', category: 'intro' };

            // Build a proper mock chain that supports .insert().select().single()
            const chainMaker = () => {
                const chain: Record<string, any> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    insert: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: insertedScript, error: null }),
                };
                return chain;
            };

            const mockSb = {
                from: vi.fn().mockImplementation(() => chainMaker()),
            };
            tools = createProspectingTools(makeToolContext(mockSb as any));

            const result = await (tools.createQuickScript as any).execute({
                title: 'Meu script',
                category: 'intro',
                template: 'Ola, sou...',
            });
            expect(result.success).toBe(true);
            expect(result.script.title).toBe('Meu script');
        });
    });

    describe('generateAndSaveScript', () => {
        it('is defined', () => {
            expect(tools.generateAndSaveScript).toBeDefined();
        });

        it('persists generated script to quick_scripts', async () => {
            const saved = { id: 's-gen', title: 'Script gerado', category: 'closing', template: 'Contexto...' };

            // First call: maybeSingle for base script (optional)
            // Second call: single for insert
            const chainMaker = () => {
                const chain: Record<string, any> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    insert: vi.fn().mockReturnThis(),
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    single: vi.fn().mockResolvedValue({ data: saved, error: null }),
                };
                return chain;
            };

            const mockSb = {
                from: vi.fn().mockImplementation(() => chainMaker()),
            };
            tools = createProspectingTools(makeToolContext(mockSb as any));

            const result = await (tools.generateAndSaveScript as any).execute({
                title: 'Script gerado',
                category: 'closing',
                context: 'Deal de alto valor',
            });
            expect(result.success).toBe(true);
            expect(result.script.title).toBe('Script gerado');
        });
    });
});
