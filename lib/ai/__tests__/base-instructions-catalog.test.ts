import { describe, it, expect } from 'vitest';
import { getPromptCatalogMap } from '../prompts/catalog';

/**
 * Tests for BASE_INSTRUCTIONS catalog alignment (TD-2.2 / AC1-AC4).
 *
 * Verifies the catalog default template lists all 36 tools and mentions lead score.
 */

describe('agent_crm_base_instructions catalog entry (AC3)', () => {
    const catalog = getPromptCatalogMap();
    const entry = catalog['agent_crm_base_instructions'];

    it('exists in the catalog', () => {
        expect(entry).toBeDefined();
        expect(entry.key).toBe('agent_crm_base_instructions');
    });

    it('default template mentions all 36 tools', () => {
        const template = entry.defaultTemplate;

        // Pipeline tools
        expect(template).toContain('analyzePipeline');
        expect(template).toContain('getBoardMetrics');
        expect(template).toContain('listStages');
        expect(template).toContain('updateStage');
        expect(template).toContain('reorderStages');

        // Deal tools
        expect(template).toContain('searchDeals');
        expect(template).toContain('listDealsByStage');
        expect(template).toContain('listStagnantDeals');
        expect(template).toContain('listOverdueDeals');
        expect(template).toContain('getDealDetails');
        expect(template).toContain('moveDeal');
        expect(template).toContain('createDeal');
        expect(template).toContain('updateDeal');
        expect(template).toContain('markDealAsWon');
        expect(template).toContain('markDealAsLost');
        expect(template).toContain('assignDeal');
        expect(template).toContain('moveDealsBulk');

        // Contact tools
        expect(template).toContain('searchContacts');
        expect(template).toContain('createContact');
        expect(template).toContain('updateContact');
        expect(template).toContain('getContactDetails');
        expect(template).toContain('linkDealToContact');
        expect(template).toContain('getLeadScore');

        // Activity tools
        expect(template).toContain('createTask');
        expect(template).toContain('listActivities');
        expect(template).toContain('completeActivity');
        expect(template).toContain('rescheduleActivity');
        expect(template).toContain('logActivity');

        // Note tools
        expect(template).toContain('addDealNote');
        expect(template).toContain('listDealNotes');

        // Prospecting tools (new in TD-2.2)
        expect(template).toContain('listProspectingQueues');
        expect(template).toContain('getProspectingMetrics');
        expect(template).toContain('getProspectingGoals');
        expect(template).toContain('listQuickScripts');
        expect(template).toContain('createQuickScript');
        expect(template).toContain('generateAndSaveScript');
    });

    it('mentions lead score proactively (AC4)', () => {
        const template = entry.defaultTemplate;
        expect(template).toContain('getLeadScore');
        expect(template.toLowerCase()).toContain('lead score');
    });

    it('mentions 36 tools count', () => {
        expect(entry.defaultTemplate).toContain('36');
    });
});

describe('BASE_INSTRUCTIONS_FALLBACK alignment', () => {
    // The fallback constant in crmAgent.ts should also mention 36 tools.
    // We test the catalog default which is the authoritative source.
    it('catalog notes mention TD-2.2 update', () => {
        const catalog = getPromptCatalogMap();
        const entry = catalog['agent_crm_base_instructions'];
        expect(entry.notes).toContain('TD-2.2');
    });
});
