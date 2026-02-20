-- =============================================================================
-- MIGRATION: Protect owner_id from corretor UPDATE
-- =============================================================================
-- Story: 1.3 - Corretor Responsável
-- Date: 2026-02-20
-- Description:
--   Adjust UPDATE policies on deals and contacts so that corretores
--   can update their own records BUT cannot change the owner_id field.
--   Admin/Diretor can change owner_id freely.
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Replace UPDATE policy on deals
-- =============================================================================

DROP POLICY IF EXISTS "Users can update own deals or managers can update all" ON public.deals;

-- Corretor: can update own deals, but owner_id must stay the same
-- Admin/Diretor: can update any deal in org, including owner_id
CREATE POLICY "Users can update own deals or managers can update all"
  ON public.deals
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = deals.organization_id
        AND role IN ('admin', 'diretor')
    )
  )
  WITH CHECK (
    -- Admin/Diretor: no restriction on owner_id changes
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = deals.organization_id
        AND role IN ('admin', 'diretor')
    )
    -- Corretor: NEW.owner_id must still be auth.uid()
    -- Combined with USING (OLD.owner_id = auth.uid()), this prevents
    -- a corretor from changing owner_id to anyone else.
    OR owner_id = auth.uid()
  );

-- =============================================================================
-- STEP 2: Replace UPDATE policy on contacts
-- =============================================================================

DROP POLICY IF EXISTS "Users can update own contacts or managers can update all" ON public.contacts;

CREATE POLICY "Users can update own contacts or managers can update all"
  ON public.contacts
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = contacts.organization_id
        AND role IN ('admin', 'diretor')
    )
  )
  WITH CHECK (
    -- Admin/Diretor: no restriction
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = contacts.organization_id
        AND role IN ('admin', 'diretor')
    )
    -- Corretor: NEW.owner_id must still be auth.uid()
    -- Combined with USING (OLD.owner_id = auth.uid()), this prevents
    -- a corretor from changing owner_id to anyone else.
    OR owner_id = auth.uid()
  );

COMMIT;
