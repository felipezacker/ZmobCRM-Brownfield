-- Fix: When a contact is soft-deleted, deals keep a stale contact_id
-- pointing to a contact that no longer appears in queries (filtered by deleted_at IS NULL).
-- This causes "Sem Contato" on the board even though the deal exists.
--
-- Solution:
-- 1. Add trigger to nullify deals.contact_id when contact is soft-deleted
-- 2. Fix existing orphaned deals in production

-- 1. Trigger: clear contact_id on deals when contact is soft-deleted
CREATE OR REPLACE FUNCTION clear_deal_contact_on_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        UPDATE deals
        SET contact_id = NULL, updated_at = NOW()
        WHERE contact_id = NEW.id AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clear_deal_contact_on_contact_delete ON contacts;
CREATE TRIGGER clear_deal_contact_on_contact_delete
    AFTER UPDATE OF deleted_at ON contacts
    FOR EACH ROW WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
    EXECUTE FUNCTION clear_deal_contact_on_soft_delete();

-- 2. Fix existing orphaned deals (contact was already soft-deleted or hard-deleted)
UPDATE deals d
SET contact_id = NULL, updated_at = NOW()
WHERE d.contact_id IS NOT NULL
  AND d.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = d.contact_id
      AND c.deleted_at IS NULL
  );
