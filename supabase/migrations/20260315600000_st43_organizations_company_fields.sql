-- ST-4.3: Add company info fields to organizations
-- Columns: cnpj, creci, phone for the Company Settings page

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS creci TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;
