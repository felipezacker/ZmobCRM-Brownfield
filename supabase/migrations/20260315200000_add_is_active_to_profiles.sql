-- Migration: Add is_active column to profiles for user deactivation
-- Story: ST-3.2 — Desativar Usuario + Filtro/Busca

ALTER TABLE profiles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Partial index: only indexes inactive users (optimizes middleware lookup)
CREATE INDEX idx_profiles_is_active ON profiles(is_active) WHERE is_active = false;
