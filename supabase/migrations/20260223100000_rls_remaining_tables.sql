-- ============================================================
-- Migration: RLS Restrictive Policies for Remaining Tables
-- Story 1.3 - DB-010: RLS ~12 tabelas restantes
-- Story 1.3 - DB-022: get_contact_stage_counts() org filter
-- Story 1.3 - DB-023: log_audit_event() org validation
-- ============================================================
-- Prerequisites: Migration 20260223000000 (is_admin_or_director helper, indices)
-- Pattern: admin = CRUD org, diretor = READ org + CRUD own, corretor = CRUD own
-- ============================================================

BEGIN;

-- ============================================================
-- PART 1: PERFORMANCE INDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_boards_organization_id ON public.boards(organization_id);
CREATE INDEX IF NOT EXISTS idx_boards_owner_id ON public.boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_board_stages_organization_id ON public.board_stages(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_organization_id ON public.activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_owner_id ON public.activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_organization_id ON public.deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_deal_notes_deal_id ON public.deal_notes(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_files_deal_id ON public.deal_files(deal_id);
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON public.products(organization_id);
CREATE INDEX IF NOT EXISTS idx_deal_items_organization_id ON public.deal_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_deal_items_deal_id ON public.deal_items(deal_id);
CREATE INDEX IF NOT EXISTS idx_tags_organization_id ON public.tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_organization_id ON public.custom_field_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_notifications_organization_id ON public.system_notifications(organization_id);
-- idx_system_notifications_user_id skipped: column user_id does not exist in production
-- idx_crm_companies skipped: table crm_companies does not exist in production

-- ============================================================
-- PART 2: BOARDS
-- ============================================================
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "boards_select" ON public.boards;
DROP POLICY IF EXISTS "boards_insert" ON public.boards;
DROP POLICY IF EXISTS "boards_update" ON public.boards;
DROP POLICY IF EXISTS "boards_delete" ON public.boards;
-- Drop any permissive catch-all policies
DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.boards;', E'\n')
    FROM pg_policies WHERE tablename = 'boards' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "boards_select" ON public.boards
    FOR SELECT TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "boards_insert" ON public.boards
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "boards_update" ON public.boards
    FOR UPDATE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (owner_id = auth.uid() OR public.is_admin_or_director(organization_id))
    );

CREATE POLICY "boards_delete" ON public.boards
    FOR DELETE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (owner_id = auth.uid() OR public.is_admin_or_director(organization_id))
    );

-- ============================================================
-- PART 3: BOARD_STAGES
-- ============================================================
ALTER TABLE public.board_stages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.board_stages;', E'\n')
    FROM pg_policies WHERE tablename = 'board_stages' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "board_stages_select" ON public.board_stages
    FOR SELECT TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "board_stages_insert" ON public.board_stages
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin_or_director(organization_id)
    );

CREATE POLICY "board_stages_update" ON public.board_stages
    FOR UPDATE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin_or_director(organization_id)
    );

CREATE POLICY "board_stages_delete" ON public.board_stages
    FOR DELETE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin_or_director(organization_id)
    );

-- ============================================================
-- PART 4: ACTIVITIES
-- ============================================================
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.activities;', E'\n')
    FROM pg_policies WHERE tablename = 'activities' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "activities_select" ON public.activities
    FOR SELECT TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (owner_id = auth.uid() OR public.is_admin_or_director(organization_id))
    );

CREATE POLICY "activities_insert" ON public.activities
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "activities_update" ON public.activities
    FOR UPDATE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (owner_id = auth.uid() OR public.is_admin_or_director(organization_id))
    );

CREATE POLICY "activities_delete" ON public.activities
    FOR DELETE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (owner_id = auth.uid() OR public.is_admin_or_director(organization_id))
    );

-- ============================================================
-- PART 5: DEALS
-- ============================================================
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.deals;', E'\n')
    FROM pg_policies WHERE tablename = 'deals' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "deals_select" ON public.deals
    FOR SELECT TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (owner_id = auth.uid() OR public.is_admin_or_director(organization_id))
    );

CREATE POLICY "deals_insert" ON public.deals
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "deals_update" ON public.deals
    FOR UPDATE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (owner_id = auth.uid() OR public.is_admin_or_director(organization_id))
    );

CREATE POLICY "deals_delete" ON public.deals
    FOR DELETE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (owner_id = auth.uid() OR public.is_admin_or_director(organization_id))
    );

-- ============================================================
-- PART 6: CONTACTS
-- ============================================================
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.contacts;', E'\n')
    FROM pg_policies WHERE tablename = 'contacts' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "contacts_select" ON public.contacts
    FOR SELECT TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (owner_id = auth.uid() OR public.is_admin_or_director(organization_id))
    );

CREATE POLICY "contacts_insert" ON public.contacts
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "contacts_update" ON public.contacts
    FOR UPDATE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (owner_id = auth.uid() OR public.is_admin_or_director(organization_id))
    );

CREATE POLICY "contacts_delete" ON public.contacts
    FOR DELETE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (owner_id = auth.uid() OR public.is_admin_or_director(organization_id))
    );

-- ============================================================
-- PART 7: DEAL_NOTES (via deals JOIN)
-- ============================================================
ALTER TABLE public.deal_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.deal_notes;', E'\n')
    FROM pg_policies WHERE tablename = 'deal_notes' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "deal_notes_select" ON public.deal_notes
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id = deal_notes.deal_id
            AND d.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "deal_notes_insert" ON public.deal_notes
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id = deal_notes.deal_id
            AND d.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "deal_notes_update" ON public.deal_notes
    FOR UPDATE TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id = deal_notes.deal_id
            AND public.is_admin_or_director(d.organization_id)
        )
    );

CREATE POLICY "deal_notes_delete" ON public.deal_notes
    FOR DELETE TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id = deal_notes.deal_id
            AND public.is_admin_or_director(d.organization_id)
        )
    );

-- ============================================================
-- PART 8: DEAL_FILES (via deals JOIN)
-- ============================================================
ALTER TABLE public.deal_files ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.deal_files;', E'\n')
    FROM pg_policies WHERE tablename = 'deal_files' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "deal_files_select" ON public.deal_files
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id = deal_files.deal_id
            AND d.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "deal_files_insert" ON public.deal_files
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id = deal_files.deal_id
            AND d.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "deal_files_update" ON public.deal_files
    FOR UPDATE TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id = deal_files.deal_id
            AND public.is_admin_or_director(d.organization_id)
        )
    );

CREATE POLICY "deal_files_delete" ON public.deal_files
    FOR DELETE TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id = deal_files.deal_id
            AND public.is_admin_or_director(d.organization_id)
        )
    );

-- ============================================================
-- PART 9: PRODUCTS
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.products;', E'\n')
    FROM pg_policies WHERE tablename = 'products' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "products_select" ON public.products
    FOR SELECT TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "products_insert" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin_or_director(organization_id)
    );

CREATE POLICY "products_update" ON public.products
    FOR UPDATE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin_or_director(organization_id)
    );

CREATE POLICY "products_delete" ON public.products
    FOR DELETE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin_or_director(organization_id)
    );

-- ============================================================
-- PART 10: DEAL_ITEMS
-- ============================================================
ALTER TABLE public.deal_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.deal_items;', E'\n')
    FROM pg_policies WHERE tablename = 'deal_items' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "deal_items_select" ON public.deal_items
    FOR SELECT TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "deal_items_insert" ON public.deal_items
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "deal_items_update" ON public.deal_items
    FOR UPDATE TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "deal_items_delete" ON public.deal_items
    FOR DELETE TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- PART 11: TAGS
-- ============================================================
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.tags;', E'\n')
    FROM pg_policies WHERE tablename = 'tags' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "tags_select" ON public.tags
    FOR SELECT TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tags_insert" ON public.tags
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tags_update" ON public.tags
    FOR UPDATE TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tags_delete" ON public.tags
    FOR DELETE TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- PART 12: CUSTOM_FIELD_DEFINITIONS
-- ============================================================
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.custom_field_definitions;', E'\n')
    FROM pg_policies WHERE tablename = 'custom_field_definitions' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "custom_field_definitions_select" ON public.custom_field_definitions
    FOR SELECT TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "custom_field_definitions_insert" ON public.custom_field_definitions
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin_or_director(organization_id)
    );

CREATE POLICY "custom_field_definitions_update" ON public.custom_field_definitions
    FOR UPDATE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin_or_director(organization_id)
    );

CREATE POLICY "custom_field_definitions_delete" ON public.custom_field_definitions
    FOR DELETE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin_or_director(organization_id)
    );

-- ============================================================
-- PART 13: SYSTEM_NOTIFICATIONS
-- ============================================================
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.system_notifications;', E'\n')
    FROM pg_policies WHERE tablename = 'system_notifications' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- NOTE: No INSERT policy — system_notifications are created server-side only
-- (e.g., via triggers, edge functions, or service_role). This is intentional.

CREATE POLICY "system_notifications_select" ON public.system_notifications
    FOR SELECT TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "system_notifications_update" ON public.system_notifications
    FOR UPDATE TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "system_notifications_delete" ON public.system_notifications
    FOR DELETE TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- PART 14: LIFECYCLE_STAGES (global reference)
-- ============================================================
ALTER TABLE public.lifecycle_stages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.lifecycle_stages;', E'\n')
    FROM pg_policies WHERE tablename = 'lifecycle_stages' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Global reference table: all authenticated can read, only admin can modify
CREATE POLICY "lifecycle_stages_select" ON public.lifecycle_stages
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "lifecycle_stages_insert" ON public.lifecycle_stages
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "lifecycle_stages_update" ON public.lifecycle_stages
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "lifecycle_stages_delete" ON public.lifecycle_stages
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- PART 15: CRM_COMPANIES skipped — table does not exist in production

-- ============================================================
-- PART 16: ORGANIZATION_SETTINGS (admin only)
-- ============================================================
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.organization_settings;', E'\n')
    FROM pg_policies WHERE tablename = 'organization_settings' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- All org members can read settings (needed for AI provider config)
CREATE POLICY "organization_settings_select" ON public.organization_settings
    FOR SELECT TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Only admin can modify settings
CREATE POLICY "organization_settings_insert" ON public.organization_settings
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "organization_settings_update" ON public.organization_settings
    FOR UPDATE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "organization_settings_delete" ON public.organization_settings
    FOR DELETE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- PART 17: USER_SETTINGS (own only)
-- ============================================================
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.user_settings;', E'\n')
    FROM pg_policies WHERE tablename = 'user_settings' AND schemaname = 'public'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "user_settings_select" ON public.user_settings
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "user_settings_insert" ON public.user_settings
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings_update" ON public.user_settings
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- ============================================================
-- PART 18: FIX CROSS-TENANT FUNCTIONS (DB-022, DB-023)
-- ============================================================

-- Drop the no-parameter version to avoid confusion with the org-scoped version below
DROP FUNCTION IF EXISTS public.get_contact_stage_counts();

-- DB-022: get_contact_stage_counts — add org filter
CREATE OR REPLACE FUNCTION public.get_contact_stage_counts(p_org_id UUID)
RETURNS TABLE(stage_id TEXT, stage_name TEXT, contact_count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        ls.id AS stage_id,
        ls.name AS stage_name,
        COUNT(c.id) AS contact_count
    FROM public.lifecycle_stages ls
    LEFT JOIN public.contacts c
        ON c.stage = ls.id
        AND c.organization_id = p_org_id
    GROUP BY ls.id, ls.name, ls.order
    ORDER BY ls.order;
$$;

-- DB-023: log_audit_event — validate org via auth.uid()
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_log_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT organization_id INTO v_org_id
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'User has no organization';
    END IF;

    INSERT INTO public.audit_logs (
        user_id, organization_id, action, entity_type, entity_id, details
    ) VALUES (
        v_user_id, v_org_id, p_action, p_entity_type, p_entity_id, p_details
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

COMMIT;
