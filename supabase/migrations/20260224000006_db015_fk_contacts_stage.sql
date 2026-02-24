-- DB-015: Add FK constraint contacts.stage -> lifecycle_stages.id
-- Both columns are TEXT type, so the FK is straightforward.
-- contacts.stage values (LEAD, MQL, PROSPECT, CUSTOMER, OTHER) must exist in lifecycle_stages.id.

DO $$
BEGIN
    -- Check that lifecycle_stages table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'lifecycle_stages'
    ) THEN
        RAISE NOTICE 'DB-015 SKIPPED: lifecycle_stages table does not exist';
        RETURN;
    END IF;

    -- Check that contacts table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'contacts'
    ) THEN
        RAISE NOTICE 'DB-015 SKIPPED: contacts table does not exist';
        RETURN;
    END IF;

    -- Check constraint does not already exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_contacts_stage_lifecycle_stages'
          AND table_schema = 'public'
          AND table_name = 'contacts'
    ) THEN
        RAISE NOTICE 'DB-015 SKIPPED: constraint fk_contacts_stage_lifecycle_stages already exists';
        RETURN;
    END IF;

    -- Verify no orphan values in contacts.stage before adding FK
    IF EXISTS (
        SELECT 1 FROM public.contacts c
        WHERE c.stage IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.lifecycle_stages ls WHERE ls.id = c.stage)
    ) THEN
        RAISE WARNING 'DB-015: Found contacts.stage values not in lifecycle_stages. Fixing orphans to NULL before adding FK.';
        UPDATE public.contacts
        SET stage = NULL
        WHERE stage IS NOT NULL
          AND stage NOT IN (SELECT id FROM public.lifecycle_stages);
    END IF;

    -- Add the FK constraint
    ALTER TABLE public.contacts
        ADD CONSTRAINT fk_contacts_stage_lifecycle_stages
        FOREIGN KEY (stage) REFERENCES public.lifecycle_stages(id);

    RAISE NOTICE 'DB-015 APPLIED: FK contacts.stage -> lifecycle_stages.id';
END;
$$;
