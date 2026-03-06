-- Add prospecting tables to supabase_realtime publication
-- Required for Realtime subscriptions in useRealtimeSync (DX-1.1)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'prospecting_queues') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE prospecting_queues;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'prospecting_saved_queues') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE prospecting_saved_queues;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'prospecting_daily_goals') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE prospecting_daily_goals;
    END IF;
END $$;
