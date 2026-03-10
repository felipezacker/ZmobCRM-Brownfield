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
        or: vi.fn().mockReturnThis(),
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

    describe('suggestScript', () => {
        it('is defined and has execute', () => {
            expect(tools.suggestScript).toBeDefined();
            expect((tools.suggestScript as any).execute).toBeTypeOf('function');
        });

        it('suggests rescue script for no_answer outcome', async () => {
            const mockActivities = [
                { id: 'a1', type: 'CALL', date: '2026-03-07T10:00:00Z', metadata: { outcome: 'no_answer' } },
            ];
            const mockScripts = [
                { id: 's1', title: 'Resgate pos nao-atendimento', category: 'rescue', template: 'Ola, tentei ligar...' },
            ];

            let fromCallCount = 0;
            const chainMaker = () => {
                fromCallCount++;
                const chain: Record<string, any> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    or: vi.fn().mockReturnThis(),
                    is: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                };
                Object.defineProperty(chain, 'then', {
                    value: (resolve: (v: unknown) => void) => {
                        const data = fromCallCount === 1 ? mockActivities : mockScripts;
                        return Promise.resolve({ data, error: null }).then(resolve);
                    },
                    writable: true,
                });
                return chain;
            };

            const mockSb = { from: vi.fn().mockImplementation(() => chainMaker()) };
            tools = createProspectingTools(makeToolContext(mockSb as any));

            const result = await (tools.suggestScript as any).execute({ contactId: 'c1', outcome: 'no_answer' });
            expect(result.suggestedCategory).toBe('rescue');
            expect(result.script.title).toBe('Resgate pos nao-atendimento');
            expect(result.reason).toContain('no_answer');
        });

        it('suggests closing script for negotiation stage', async () => {
            let fromCallCount = 0;
            const chainMaker = () => {
                fromCallCount++;
                const chain: Record<string, any> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    or: vi.fn().mockReturnThis(),
                    is: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                };
                Object.defineProperty(chain, 'then', {
                    value: (resolve: (v: unknown) => void) => {
                        const data = fromCallCount === 1
                            ? [{ id: 'a1', type: 'CALL', date: '2026-03-07T10:00:00Z', metadata: { outcome: 'connected' } }]
                            : [{ id: 's1', title: 'Fechamento direto', category: 'closing', template: 'Vamos fechar...' }];
                        return Promise.resolve({ data, error: null }).then(resolve);
                    },
                    writable: true,
                });
                return chain;
            };

            const mockSb = { from: vi.fn().mockImplementation(() => chainMaker()) };
            tools = createProspectingTools(makeToolContext(mockSb as any));

            const result = await (tools.suggestScript as any).execute({ contactId: 'c1', stage: 'negotiation' });
            expect(result.suggestedCategory).toBe('closing');
            expect(result.script.title).toBe('Fechamento direto');
        });

        it('suggests intro script when no activities exist', async () => {
            let fromCallCount = 0;
            const chainMaker = () => {
                fromCallCount++;
                const chain: Record<string, any> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    or: vi.fn().mockReturnThis(),
                    is: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                };
                Object.defineProperty(chain, 'then', {
                    value: (resolve: (v: unknown) => void) => {
                        const data = fromCallCount === 1
                            ? []
                            : [{ id: 's1', title: 'Primeiro contato', category: 'intro', template: 'Bom dia...' }];
                        return Promise.resolve({ data, error: null }).then(resolve);
                    },
                    writable: true,
                });
                return chain;
            };

            const mockSb = { from: vi.fn().mockImplementation(() => chainMaker()) };
            tools = createProspectingTools(makeToolContext(mockSb as any));

            const result = await (tools.suggestScript as any).execute({ contactId: 'c1' });
            expect(result.suggestedCategory).toBe('intro');
            expect(result.script.title).toBe('Primeiro contato');
        });

        it('returns null script when no scripts in category', async () => {
            let fromCallCount = 0;
            const chainMaker = () => {
                fromCallCount++;
                const chain: Record<string, any> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    or: vi.fn().mockReturnThis(),
                    is: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                };
                Object.defineProperty(chain, 'then', {
                    value: (resolve: (v: unknown) => void) => {
                        return Promise.resolve({ data: fromCallCount === 1 ? [] : [], error: null }).then(resolve);
                    },
                    writable: true,
                });
                return chain;
            };

            const mockSb = { from: vi.fn().mockImplementation(() => chainMaker()) };
            tools = createProspectingTools(makeToolContext(mockSb as any));

            const result = await (tools.suggestScript as any).execute({ contactId: 'c1' });
            expect(result.script).toBeNull();
            expect(result.message).toContain('nenhum script encontrado');
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
                template: 'Ola, gostaria de finalizar a negociacao do imovel X...',
                context: 'Deal de alto valor',
            });
            expect(result.success).toBe(true);
            expect(result.script.title).toBe('Script gerado');
        });
    });

    // ========== CP-3.3: New tools ==========

    describe('listSavedQueues', () => {
        it('is defined and has execute', () => {
            expect(tools.listSavedQueues).toBeDefined();
            expect((tools.listSavedQueues as any).execute).toBeTypeOf('function');
        });

        it('returns saved queues with contact count', async () => {
            const mockQueues = [
                { id: 'sq1', name: 'Leads Quentes', filters: { contact_ids: ['c1', 'c2', 'c3'] }, owner_id: 'user-456', is_shared: false, created_at: '2026-03-07' },
                { id: 'sq2', name: 'Fila Compartilhada', filters: { contact_ids: ['c4'] }, owner_id: 'other-user', is_shared: true, created_at: '2026-03-06' },
            ];

            supabase = createMockSupabase({ queryResult: { data: mockQueues, error: null } });
            tools = createProspectingTools(makeToolContext(supabase as any));

            const result = await (tools.listSavedQueues as any).execute({});
            expect(result.count).toBe(2);
            expect(result.queues[0].name).toBe('Leads Quentes');
            expect(result.queues[0].contactCount).toBe(3);
            expect(result.queues[0].isOwn).toBe(true);
            expect(result.queues[1].isOwn).toBe(false);
            expect(result.queues[1].isShared).toBe(true);
        });

        it('returns empty list when no saved queues', async () => {
            supabase = createMockSupabase({ queryResult: { data: [], error: null } });
            tools = createProspectingTools(makeToolContext(supabase as any));

            const result = await (tools.listSavedQueues as any).execute({});
            expect(result.count).toBe(0);
            expect(result.queues).toEqual([]);
        });
    });

    describe('addContactsToQueue', () => {
        it('is defined and has execute', () => {
            expect(tools.addContactsToQueue).toBeDefined();
            expect((tools.addContactsToQueue as any).execute).toBeTypeOf('function');
        });

        it('adds contacts and skips duplicates', async () => {
            // Query 1: existing contacts in queue
            // Query 2: max position
            // Query 3: insert
            let fromCallCount = 0;
            const chainMaker = () => {
                fromCallCount++;
                const chain: Record<string, any> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    insert: vi.fn().mockReturnThis(),
                    maybeSingle: vi.fn().mockResolvedValue({ data: { position: 3 }, error: null }),
                };
                Object.defineProperty(chain, 'then', {
                    value: (resolve: (v: unknown) => void) => {
                        if (fromCallCount === 1) {
                            // Existing queue items (c1 already in queue)
                            return Promise.resolve({ data: [{ contact_id: 'c1' }], error: null }).then(resolve);
                        }
                        // Insert result
                        return Promise.resolve({ data: null, error: null }).then(resolve);
                    },
                    writable: true,
                });
                return chain;
            };

            const mockSb = { from: vi.fn().mockImplementation(() => chainMaker()) };
            tools = createProspectingTools(makeToolContext(mockSb as any));

            const result = await (tools.addContactsToQueue as any).execute({
                contactIds: ['c1', 'c2', 'c3'],
            });
            expect(result.added).toBe(2);
            expect(result.skipped).toBe(1);
        });

        it('rejects when queue would exceed 100 items', async () => {
            // Simulate 99 existing items
            let fromCallCount = 0;
            const chainMaker = () => {
                fromCallCount++;
                const chain: Record<string, any> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                };
                Object.defineProperty(chain, 'then', {
                    value: (resolve: (v: unknown) => void) => {
                        if (fromCallCount === 1) {
                            const existing = Array.from({ length: 99 }, (_, i) => ({ contact_id: `existing-${i}` }));
                            return Promise.resolve({ data: existing, error: null }).then(resolve);
                        }
                        return Promise.resolve({ data: null, error: null }).then(resolve);
                    },
                    writable: true,
                });
                return chain;
            };

            const mockSb = { from: vi.fn().mockImplementation(() => chainMaker()) };
            tools = createProspectingTools(makeToolContext(mockSb as any));

            const result = await (tools.addContactsToQueue as any).execute({
                contactIds: ['new-1', 'new-2'],
            });
            expect(result.error).toContain('limite de 100');
        });

        it('returns all skipped when all contacts already in queue', async () => {
            let fromCallCount = 0;
            const chainMaker = () => {
                fromCallCount++;
                const chain: Record<string, any> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                };
                Object.defineProperty(chain, 'then', {
                    value: (resolve: (v: unknown) => void) => {
                        return Promise.resolve({ data: [{ contact_id: 'c1' }, { contact_id: 'c2' }], error: null }).then(resolve);
                    },
                    writable: true,
                });
                return chain;
            };

            const mockSb = { from: vi.fn().mockImplementation(() => chainMaker()) };
            tools = createProspectingTools(makeToolContext(mockSb as any));

            const result = await (tools.addContactsToQueue as any).execute({
                contactIds: ['c1', 'c2'],
            });
            expect(result.added).toBe(0);
            expect(result.skipped).toBe(2);
        });
    });

    describe('suggestContactsForProspecting', () => {
        it('is defined and has execute', () => {
            expect(tools.suggestContactsForProspecting).toBeDefined();
            expect((tools.suggestContactsForProspecting as any).execute).toBeTypeOf('function');
        });

        it('returns ranked suggestions with reasons', async () => {
            const mockContacts = [
                { id: 'c1', name: 'Ana', phone: '11999', email: null, stage: 'prospecting', temperature: 'HOT', lead_score: 80, last_contact_date: '2026-02-15T10:00:00Z', created_at: '2026-01-01' },
                { id: 'c2', name: 'Bruno', phone: '11888', email: null, stage: 'prospecting', temperature: 'WARM', lead_score: 40, last_contact_date: '2026-03-08T10:00:00Z', created_at: '2026-01-01' },
            ];

            let fromCallCount = 0;
            const chainMaker = () => {
                fromCallCount++;
                const chain: Record<string, any> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    is: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                };
                Object.defineProperty(chain, 'then', {
                    value: (resolve: (v: unknown) => void) => {
                        if (fromCallCount === 1) {
                            return Promise.resolve({ data: mockContacts, error: null }).then(resolve);
                        }
                        // Recent calls (empty)
                        return Promise.resolve({ data: [], error: null }).then(resolve);
                    },
                    writable: true,
                });
                return chain;
            };

            const mockSb = { from: vi.fn().mockImplementation(() => chainMaker()) };
            tools = createProspectingTools(makeToolContext(mockSb as any));

            const result = await (tools.suggestContactsForProspecting as any).execute({ count: 10 });
            expect(result.count).toBe(2);
            expect(result.suggestions[0]).toHaveProperty('name');
            expect(result.suggestions[0]).toHaveProperty('leadScore');
            expect(result.suggestions[0]).toHaveProperty('temperature');
            expect(result.suggestions[0]).toHaveProperty('daysSinceLastContact');
            expect(result.suggestions[0]).toHaveProperty('suggestedAction');
            expect(result.suggestions[0]).toHaveProperty('reason');
        });

        it('returns empty when no contacts match filters', async () => {
            supabase = createMockSupabase({ queryResult: { data: [], error: null } });
            tools = createProspectingTools(makeToolContext(supabase as any));

            const result = await (tools.suggestContactsForProspecting as any).execute({ count: 10 });
            expect(result.count).toBe(0);
            expect(result.suggestions).toEqual([]);
        });

        it('filters by temperature when provided', async () => {
            const mockContacts = [
                { id: 'c1', name: 'Ana', phone: '11999', email: null, stage: 'prospecting', temperature: 'HOT', lead_score: 80, last_contact_date: '2026-02-15T10:00:00Z', created_at: '2026-01-01' },
            ];

            let fromCallCount = 0;
            const chainMaker = () => {
                fromCallCount++;
                const chain: Record<string, any> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    is: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                };
                Object.defineProperty(chain, 'then', {
                    value: (resolve: (v: unknown) => void) => {
                        if (fromCallCount === 1) return Promise.resolve({ data: mockContacts, error: null }).then(resolve);
                        return Promise.resolve({ data: [], error: null }).then(resolve);
                    },
                    writable: true,
                });
                return chain;
            };

            const mockSb = { from: vi.fn().mockImplementation(() => chainMaker()) };
            tools = createProspectingTools(makeToolContext(mockSb as any));

            const result = await (tools.suggestContactsForProspecting as any).execute({ count: 5, temperature: 'HOT' });
            expect(result.count).toBe(1);
            expect(result.suggestions[0].temperature).toBe('HOT');
        });
    });

    describe('analyzeProspectingPatterns', () => {
        it('is defined and has execute', () => {
            expect(tools.analyzeProspectingPatterns).toBeDefined();
            expect((tools.analyzeProspectingPatterns as any).execute).toBeTypeOf('function');
        });

        it('returns insights with bestHour and bestDay', async () => {
            // Generate mock activities across different hours/days
            const mockActivities = [
                { id: 'a1', date: '2026-03-03T10:00:00Z', contact_id: 'c1', metadata: { outcome: 'connected' } },
                { id: 'a2', date: '2026-03-03T10:30:00Z', contact_id: 'c2', metadata: { outcome: 'connected' } },
                { id: 'a3', date: '2026-03-03T10:45:00Z', contact_id: 'c3', metadata: { outcome: 'no_answer' } },
                { id: 'a4', date: '2026-03-04T14:00:00Z', contact_id: 'c4', metadata: { outcome: 'connected' } },
                { id: 'a5', date: '2026-03-04T14:30:00Z', contact_id: 'c5', metadata: { outcome: 'no_answer' } },
            ];

            // Query 1: activities
            // Query 2: neglected contacts details
            let fromCallCount = 0;
            const chainMaker = () => {
                fromCallCount++;
                const chain: Record<string, any> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    is: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                };
                Object.defineProperty(chain, 'then', {
                    value: (resolve: (v: unknown) => void) => {
                        if (fromCallCount === 1) return Promise.resolve({ data: mockActivities, error: null }).then(resolve);
                        // Neglected contacts
                        return Promise.resolve({
                            data: [
                                { id: 'c1', name: 'Contato Antigo', temperature: 'WARM', lead_score: 50 },
                            ],
                            error: null,
                        }).then(resolve);
                    },
                    writable: true,
                });
                return chain;
            };

            const mockSb = { from: vi.fn().mockImplementation(() => chainMaker()) };
            tools = createProspectingTools(makeToolContext(mockSb as any));

            const result = await (tools.analyzeProspectingPatterns as any).execute({ period: '30d' });
            expect(result.totalCalls).toBe(5);
            expect(result.bestHour).toHaveProperty('hour');
            expect(result.bestHour).toHaveProperty('connectionRate');
            expect(result.bestDay).toHaveProperty('dayOfWeek');
            expect(result.bestDay).toHaveProperty('totalCalls');
            expect(result.summary).toContain('5 ligacoes');
        });

        it('returns empty message when no calls in period', async () => {
            supabase = createMockSupabase({ queryResult: { data: [], error: null } });
            tools = createProspectingTools(makeToolContext(supabase as any));

            const result = await (tools.analyzeProspectingPatterns as any).execute({ period: '7d' });
            expect(result.totalCalls).toBe(0);
            expect(result.summary).toContain('Nenhuma ligacao');
        });
    });
});
