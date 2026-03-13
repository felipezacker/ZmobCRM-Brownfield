-- RT-0.1: Fix trigger notify_deal_stage_changed — tabelas incorretas
--
-- A refatoracao em 20260225000000_coderabbit_pr5_fixes.sql renomeou
-- incorretamente as tabelas de destino:
--   webhook_events_out     → integration_webhook_events   (NAO EXISTE)
--   webhook_deliveries     → integration_webhook_deliveries (NAO EXISTE)
--
-- Alem disso, as colunas dos INSERTs e UPDATEs foram desalinhadas do schema real.
--
-- Esta migration restaura os nomes corretos e alinha as colunas,
-- mantendo todas as melhorias de seguranca da PR#5:
--   - SECURITY DEFINER (bypass RLS para trigger interno)
--   - Filtro organization_id em todos os SELECTs (multi-tenant)
--   - Headers X-Webhook-Event e X-Webhook-Delivery

CREATE OR REPLACE FUNCTION public.notify_deal_stage_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  endpoint RECORD;
  board_name TEXT;
  from_label TEXT;
  to_label TEXT;
  contact_name TEXT;
  contact_phone TEXT;
  contact_email TEXT;
  payload JSONB;
  event_id UUID;
  delivery_id UUID;
  req_id BIGINT;
BEGIN
  IF (TG_OP <> 'UPDATE') THEN
    RETURN NEW;
  END IF;

  IF NEW.stage_id IS NOT DISTINCT FROM OLD.stage_id THEN
    RETURN NEW;
  END IF;

  -- Enriquecimento com filtro organization_id (PR#5 security fix)
  SELECT b.name INTO board_name
  FROM public.boards b
  WHERE b.id = NEW.board_id
    AND b.organization_id = NEW.organization_id;

  SELECT bs.label INTO to_label
  FROM public.board_stages bs
  WHERE bs.id = NEW.stage_id
    AND bs.organization_id = NEW.organization_id;

  SELECT bs.label INTO from_label
  FROM public.board_stages bs
  WHERE bs.id = OLD.stage_id
    AND bs.organization_id = NEW.organization_id;

  IF NEW.contact_id IS NOT NULL THEN
    SELECT c.name, c.phone, c.email
      INTO contact_name, contact_phone, contact_email
    FROM public.contacts c
    WHERE c.id = NEW.contact_id
      AND c.organization_id = NEW.organization_id;
  END IF;

  FOR endpoint IN
    SELECT * FROM public.integration_outbound_endpoints e
    WHERE e.organization_id = NEW.organization_id
      AND e.active = true
      AND 'deal.stage_changed' = ANY(e.events)
  LOOP
    payload := jsonb_build_object(
      'event_type', 'deal.stage_changed',
      'occurred_at', now(),
      'deal', jsonb_build_object(
        'id', NEW.id,
        'title', NEW.title,
        'value', NEW.value,
        'board_id', NEW.board_id,
        'board_name', board_name,
        'from_stage_id', OLD.stage_id,
        'from_stage_label', from_label,
        'to_stage_id', NEW.stage_id,
        'to_stage_label', to_label,
        'contact_id', NEW.contact_id
      ),
      'contact', jsonb_build_object(
        'name', contact_name,
        'phone', contact_phone,
        'email', contact_email
      ),
      'organization_id', NEW.organization_id
    );

    -- INSERT com colunas corretas de webhook_events_out (schema real)
    INSERT INTO public.webhook_events_out (
      organization_id, event_type, payload, deal_id, from_stage_id, to_stage_id
    ) VALUES (
      NEW.organization_id, 'deal.stage_changed', payload, NEW.id, OLD.stage_id, NEW.stage_id
    ) RETURNING id INTO event_id;

    -- INSERT com colunas corretas de webhook_deliveries (schema real)
    INSERT INTO public.webhook_deliveries (
      organization_id, endpoint_id, event_id, status
    ) VALUES (
      NEW.organization_id, endpoint.id, event_id, 'queued'
    ) RETURNING id INTO delivery_id;

    -- Dispara HTTP async (MVP)
    BEGIN
      SELECT net.http_post(
        url := endpoint.url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Webhook-Event', 'deal.stage_changed',
          'X-Webhook-Delivery', delivery_id::text,
          'X-Webhook-Secret', endpoint.secret
        ),
        body := payload
      ) INTO req_id;

      UPDATE public.webhook_deliveries
        SET request_id = req_id
      WHERE id = delivery_id;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.webhook_deliveries
        SET status = 'failed',
            error = SQLERRM
      WHERE id = delivery_id;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;
