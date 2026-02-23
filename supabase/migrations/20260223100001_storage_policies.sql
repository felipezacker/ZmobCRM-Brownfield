-- ============================================================
-- Migration: Storage Policies for deal-files bucket
-- Story 1.3 - DB-018: Storage policies restritivas
-- ============================================================
-- Deal files access must be scoped to organization via deal ownership.
-- Pattern: user can access files only for deals in their organization.
-- ============================================================

-- Drop existing permissive storage policies if any
DROP POLICY IF EXISTS "deal_files_select" ON storage.objects;
DROP POLICY IF EXISTS "deal_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "deal_files_update" ON storage.objects;
DROP POLICY IF EXISTS "deal_files_delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload deal files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read deal files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete deal files" ON storage.objects;

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Helper: Check if user belongs to the org that owns the deal referenced by the file path
-- File paths follow pattern: {deal_id}/{filename}
-- We extract deal_id from the path and verify org membership

-- SELECT: User can read files for deals in their organization
CREATE POLICY "deal_files_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'deal-files'
        AND EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id::text = (string_to_array(name, '/'))[1]
            AND d.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- INSERT: User can upload files for deals in their organization
CREATE POLICY "deal_files_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'deal-files'
        AND EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id::text = (string_to_array(name, '/'))[1]
            AND d.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- UPDATE: User can update files for deals in their organization
CREATE POLICY "deal_files_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'deal-files'
        AND EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id::text = (string_to_array(name, '/'))[1]
            AND d.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- DELETE: User can delete files for deals in their organization (owner or admin/director)
CREATE POLICY "deal_files_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'deal-files'
        AND EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.id::text = (string_to_array(name, '/'))[1]
            AND d.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
            AND (
                d.owner_id = auth.uid()
                OR public.is_admin_or_director(d.organization_id)
            )
        )
    );
