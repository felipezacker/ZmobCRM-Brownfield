-- RT-3.1: Add notifications, deal_notes, and system_notifications to supabase_realtime publication
-- Required for Realtime subscriptions in NotificationPopover and DealDetailModal

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'deal_notes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE deal_notes;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'system_notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE system_notifications;
    END IF;
END $$;
