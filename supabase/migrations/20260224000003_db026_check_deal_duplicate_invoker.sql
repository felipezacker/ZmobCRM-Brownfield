-- =============================================================================
-- DB-026: Convert check_deal_duplicate to SECURITY INVOKER
-- =============================================================================
-- The function currently uses the default SECURITY INVOKER (no explicit
-- SECURITY DEFINER was set in the original definition). However, to be
-- explicit and ensure it runs with the caller's permissions (respecting RLS),
-- we recreate it with an explicit SECURITY INVOKER declaration.

CREATE OR REPLACE FUNCTION public.check_deal_duplicate()
RETURNS TRIGGER AS $$
DECLARE
    existing_deal RECORD;
BEGIN
    IF NEW.contact_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT d.id, d.title, bs.label as stage_name
    INTO existing_deal
    FROM deals d
    LEFT JOIN board_stages bs ON d.stage_id = bs.id
    WHERE d.contact_id = NEW.contact_id
      AND d.stage_id = NEW.stage_id
      AND d.deleted_at IS NULL
      AND d.is_won = FALSE
      AND d.is_lost = FALSE
      AND NEW.is_won = FALSE
      AND NEW.is_lost = FALSE
      AND (TG_OP = 'INSERT' OR d.id != NEW.id)
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Ja existe um negocio para este contato no estagio "%". Mova o negocio existente ou escolha outro estagio.',
            COALESCE(existing_deal.stage_name, 'desconhecido')
        USING ERRCODE = 'unique_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER;
