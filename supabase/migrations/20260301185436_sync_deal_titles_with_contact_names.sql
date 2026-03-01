-- Sync deal titles with contact names
-- Deals currently have titles like "Novo Negócio - João", "Deal - Maria", or product names.
-- Frontend already displays contact name, so align the DB title to match.

UPDATE public.deals d
SET title = c.name
FROM public.contacts c
WHERE d.contact_id = c.id
  AND d.contact_id IS NOT NULL
  AND c.name IS NOT NULL
  AND c.name <> '';
