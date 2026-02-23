import type { SupabaseClient } from '@supabase/supabase-js';
import type { CRMCallOptions } from '@/types/ai';

export interface ToolContext {
    supabase: SupabaseClient;
    organizationId: string;
    context: CRMCallOptions;
    userId: string;
    bypassApproval: boolean;
}

export type ToolResult<T = unknown> =
    | { ok: true } & T
    | { ok: false; error: string };

export type BoardGuardResult = ToolResult;
export type DealGuardResult = ToolResult<{ deal: { id: string; title: string; board_id: string; stage_id: string; contact_id: string | null } }>;
export type StageResolveResult = ToolResult<{ stageId: string }>;
