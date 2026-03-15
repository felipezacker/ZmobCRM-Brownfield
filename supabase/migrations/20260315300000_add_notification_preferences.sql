-- Story ST-4.2: Preferencias de Notificacoes (In-App)
-- 1. Add notification_preferences JSONB column to user_settings
-- 2. Expand notifications.type CHECK constraint to include 5 new business event types

-- 1. Add column (idempotent)
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;

-- 2. Drop old CHECK constraint and recreate with expanded types
-- The original constraint only allows: BIRTHDAY, CHURN_ALERT, DEAL_STAGNANT, SCORE_DROP
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'BIRTHDAY', 'CHURN_ALERT', 'DEAL_STAGNANT', 'SCORE_DROP',
    'DEAL_ASSIGNED', 'DEAL_WON', 'DEAL_LOST', 'TASK_CREATED', 'NOTE_MENTION'
  ));
