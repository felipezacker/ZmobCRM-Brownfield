-- Migration: Security Critical — Restrictive RLS on 9 Critical Tables
-- Story: 1.1 Security Critical
-- Description: Replace permissive USING(true) policies with proper role-based
--              RLS on audit_logs, security_alerts, user_consents, ai_conversations,
--              ai_decisions, ai_audio_notes, and leads.

BEGIN;

-- ============================================================================
-- 1. Helper Function: is_admin_or_director
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_director(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND organization_id = p_org_id
      AND role IN ('admin', 'diretor')
  );
$$;

-- ============================================================================
-- 2. Performance Indices
-- ============================================================================

-- Composite index for role lookups (used in ALL RLS policies)
CREATE INDEX IF NOT EXISTS idx_profiles_org_role ON public.profiles(organization_id, role);

-- Indices for owner_id lookups
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_organization_id ON public.security_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_user_id ON public.ai_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audio_notes_user_id ON public.ai_audio_notes(user_id);

-- ============================================================================
-- 3. RLS: audit_logs (admin read-only within org)
-- ============================================================================

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_access" ON public.audit_logs;

CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
-- No INSERT/UPDATE/DELETE policies for direct access
-- Inserts happen via log_audit_event() which is SECURITY DEFINER

-- ============================================================================
-- 4. RLS: security_alerts (admin only within org)
-- ============================================================================

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.security_alerts;
DROP POLICY IF EXISTS "security_alerts_access" ON public.security_alerts;

CREATE POLICY "security_alerts_admin_access"
  ON public.security_alerts FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 5. RLS: user_consents (LGPD - user sees own, admin sees org)
-- ============================================================================

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_access" ON public.user_consents;

-- Users can see their own consents
CREATE POLICY "user_consents_select_own"
  ON public.user_consents FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin can see all consents from their org (join through profiles)
CREATE POLICY "user_consents_select_admin"
  ON public.user_consents FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT p2.id FROM public.profiles p2
      WHERE p2.organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
    AND auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
  );

-- Users can insert their own consents
CREATE POLICY "user_consents_insert_own"
  ON public.user_consents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update (revoke) their own consents
CREATE POLICY "user_consents_update_own"
  ON public.user_consents FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 6. RLS: ai_conversations (user sees own, admin/director sees org)
-- ============================================================================

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_access" ON public.ai_conversations;

CREATE POLICY "ai_conversations_own"
  ON public.ai_conversations FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_conversations_admin_read"
  ON public.ai_conversations FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT p2.id FROM public.profiles p2
      WHERE p2.organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
    AND public.is_admin_or_director(
      (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- 7. RLS: ai_decisions (user sees own, admin/director sees org)
-- ============================================================================

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.ai_decisions;
DROP POLICY IF EXISTS "ai_decisions_access" ON public.ai_decisions;

CREATE POLICY "ai_decisions_own"
  ON public.ai_decisions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_decisions_admin_read"
  ON public.ai_decisions FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT p2.id FROM public.profiles p2
      WHERE p2.organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
    AND public.is_admin_or_director(
      (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- 8. RLS: ai_audio_notes (user sees own, admin/director sees org)
-- ============================================================================

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.ai_audio_notes;
DROP POLICY IF EXISTS "ai_audio_notes_access" ON public.ai_audio_notes;

CREATE POLICY "ai_audio_notes_own"
  ON public.ai_audio_notes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_audio_notes_admin_read"
  ON public.ai_audio_notes FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT p2.id FROM public.profiles p2
      WHERE p2.organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
    AND public.is_admin_or_director(
      (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- 9. RLS: leads (owner-based, admin/director sees org)
-- ============================================================================

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.leads;
DROP POLICY IF EXISTS "leads_access" ON public.leads;

CREATE POLICY "leads_select"
  ON public.leads FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_admin_or_director(organization_id)
  );

CREATE POLICY "leads_insert"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = leads.organization_id
    )
  );

CREATE POLICY "leads_update"
  ON public.leads FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_admin_or_director(organization_id)
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.is_admin_or_director(organization_id)
  );

CREATE POLICY "leads_delete"
  ON public.leads FOR DELETE TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = leads.organization_id
        AND role = 'admin'
    )
  );

COMMIT;
