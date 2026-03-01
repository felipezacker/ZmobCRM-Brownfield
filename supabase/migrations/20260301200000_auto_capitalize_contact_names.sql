-- Auto-capitalize contact names on INSERT/UPDATE
-- Applies INITCAP to ensure consistent Title Case formatting

CREATE OR REPLACE FUNCTION public.fn_capitalize_contact_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name := INITCAP(NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_capitalize_contact_name ON public.contacts;

CREATE TRIGGER trg_capitalize_contact_name
  BEFORE INSERT OR UPDATE OF name ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_capitalize_contact_name();
