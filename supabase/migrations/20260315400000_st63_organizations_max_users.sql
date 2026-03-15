-- ST-6.3: Add max_users to organizations for user limit control
-- NULL = unlimited, 0 = none allowed, N > 0 = max N active members

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT NULL
  CHECK (max_users IS NULL OR max_users >= 0);

COMMENT ON COLUMN public.organizations.max_users IS 'Maximum active users allowed. NULL = unlimited.';
