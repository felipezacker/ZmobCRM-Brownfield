-- =============================================================================
-- DB-017: Optimize trigger notify_deal_stage_changed
-- =============================================================================
-- Change from generic AFTER UPDATE to AFTER UPDATE OF stage_id so the trigger
-- only fires when stage_id actually changes (avoids unnecessary executions on
-- every deal update like title, value, etc.).
--
-- The function already has an internal guard (IF NEW.stage_id IS NOT DISTINCT
-- FROM OLD.stage_id THEN RETURN NEW), but firing the trigger less often is
-- cheaper than entering the function body at all.

DROP TRIGGER IF EXISTS trg_notify_deal_stage_changed ON public.deals;

CREATE TRIGGER trg_notify_deal_stage_changed
  AFTER UPDATE OF stage_id ON public.deals
  FOR EACH ROW
  WHEN (OLD.stage_id IS DISTINCT FROM NEW.stage_id)
  EXECUTE FUNCTION public.notify_deal_stage_changed();
