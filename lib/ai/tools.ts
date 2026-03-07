import { createStaticAdminClient } from '@/lib/supabase/staticAdminClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CRMCallOptions } from '@/types/ai';
import type { ToolContext } from './tools/types';
import { createPipelineTools } from './tools/pipeline-tools';
import { createDealTools } from './tools/deal-tools';
import { createContactTools } from './tools/contact-tools';
import { createActivityTools } from './tools/activity-tools';
import { createNoteTools } from './tools/note-tools';
import { createProspectingTools } from './tools/prospecting-tools';

/**
 * Creates all CRM tools with context injection.
 * When a supabaseClient is provided (from request context), it uses that client which respects RLS.
 * Falls back to admin client for MCP/external contexts without a user session.
 */
export function createCRMTools(context: CRMCallOptions, userId: string, supabaseClient?: SupabaseClient) {
    const supabase = supabaseClient ?? createStaticAdminClient();
    const organizationId = context.organizationId;
    const bypassApproval = process.env.AI_TOOL_APPROVAL_BYPASS === 'true';

    const toolContext: ToolContext = {
        supabase,
        organizationId,
        context,
        userId,
        bypassApproval,
    };

    const tools = {
        ...createPipelineTools(toolContext),
        ...createDealTools(toolContext),
        ...createContactTools(toolContext),
        ...createActivityTools(toolContext),
        ...createNoteTools(toolContext),
        ...createProspectingTools(toolContext),
    } as Record<string, any>;

    // Debug/diagnóstico (scripts): registra chamadas de tools.
    if (String(process.env.AI_TOOL_CALLS_DEBUG || '').toLowerCase() === 'true') {
        const g = globalThis as any;
        if (!Array.isArray(g.__AI_TOOL_CALLS__)) g.__AI_TOOL_CALLS__ = [];

        for (const [name, t] of Object.entries(tools)) {
            const original = (t as any)?.execute;
            if (typeof original !== 'function') continue;

            (t as any).execute = async (args: any) => {
                try {
                    g.__AI_TOOL_CALLS__.push(name);
                } catch {
                    // ignore
                }
                return await original(args);
            };
        }
    }

    return tools;
}
