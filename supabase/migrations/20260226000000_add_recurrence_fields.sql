-- Story 2.1: Atividades Recorrentes
-- Adiciona campos de recorrencia a tabela activities

ALTER TABLE public.activities
  ADD COLUMN recurrence_type TEXT DEFAULT NULL
    CHECK (recurrence_type IS NULL OR recurrence_type IN ('daily', 'weekly', 'monthly')),
  ADD COLUMN recurrence_end_date DATE DEFAULT NULL;

-- Constraint cruzada: impede recurrence_end_date sem recurrence_type
ALTER TABLE public.activities
  ADD CONSTRAINT chk_recurrence_end_date_requires_type
    CHECK (recurrence_end_date IS NULL OR recurrence_type IS NOT NULL);

-- Index parcial: performance para queries de recorrencia
CREATE INDEX idx_activities_recurrence
  ON public.activities (recurrence_type, recurrence_end_date)
  WHERE recurrence_type IS NOT NULL;
