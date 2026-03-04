-- ============================================================
-- Fix: Allow all org members to SELECT contacts (org-wide read)
-- Corretores precisam ver todos os contatos da organização
-- UPDATE/DELETE permanecem restritos ao owner + admin/diretor
-- ============================================================

BEGIN;

-- DROP and recreate SELECT policy for contacts
DROP POLICY IF EXISTS "contacts_select" ON public.contacts;

CREATE POLICY "contacts_select" ON public.contacts
    FOR SELECT TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

COMMIT;
