-- Add property_ref column to deals table
-- Stores a free-text reference to the property (e.g., code, address, description)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS property_ref TEXT;
