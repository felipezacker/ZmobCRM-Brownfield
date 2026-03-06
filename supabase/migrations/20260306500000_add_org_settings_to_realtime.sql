-- Add organization_settings to supabase_realtime publication
-- Enables Realtime subscriptions for settings changes across users (DX-1.1)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'organization_settings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE organization_settings;
    END IF;
END $$;
