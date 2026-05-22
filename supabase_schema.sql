-- ==============================================================================
-- LOTOCHOCO - SUPABASE SCHEMA (OFFLINE FIRST SYNC)
-- Fase 1-9: Configuración Inicial de Base de Datos Remota
-- ==============================================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ESTRUCTURA MULTIEMPRESA (TENANTS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_users (
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (company_id, user_id)
);

-- ==========================================
-- 2. TABLAS DEL SISTEMA POS (Fase 9: Game, DrawSchedule, Result)
-- ==========================================

-- GAME
CREATE TABLE IF NOT EXISTS public.games (
  id TEXT PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT,
  is_active INTEGER DEFAULT 1,
  digit_count INTEGER DEFAULT 2,
  multiplier REAL DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- DRAW SCHEDULE
CREATE TABLE IF NOT EXISTS public.draw_schedules (
  id TEXT PRIMARY KEY,
  game_id TEXT REFERENCES public.games(id) ON DELETE CASCADE,
  name TEXT,
  time TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- RESULT
CREATE TABLE IF NOT EXISTS public.results (
  id TEXT PRIMARY KEY,
  game_id TEXT REFERENCES public.games(id),
  schedule_id TEXT REFERENCES public.draw_schedules(id),
  winning_number TEXT,
  draw_date TIMESTAMPTZ,
  is_processed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ==========================================
-- 3. ÍNDICES DE RENDIMIENTO (Sync/Pull)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_games_updated_at ON public.games(updated_at);
CREATE INDEX IF NOT EXISTS idx_games_company_id ON public.games(company_id);

CREATE INDEX IF NOT EXISTS idx_draw_schedules_updated_at ON public.draw_schedules(updated_at);
CREATE INDEX IF NOT EXISTS idx_draw_schedules_game_id ON public.draw_schedules(game_id);

CREATE INDEX IF NOT EXISTS idx_results_updated_at ON public.results(updated_at);
CREATE INDEX IF NOT EXISTS idx_results_draw_date ON public.results(draw_date);


-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Políticas Companies (Aislar a los usuarios a sus empresas)
CREATE POLICY "Users can view their own companies" ON public.companies
  FOR SELECT USING (id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Políticas Games
CREATE POLICY "Users can view games of their company" ON public.games
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert/update games of their company" ON public.games
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Políticas DrawSchedules
CREATE POLICY "Users can view schedules of their company games" ON public.draw_schedules
  FOR SELECT USING (game_id IN (SELECT id FROM public.games WHERE company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert/update schedules" ON public.draw_schedules
  FOR ALL USING (game_id IN (SELECT id FROM public.games WHERE company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())));

-- Políticas Results (Temporalmente laxas atadas a game_id para validación local)
CREATE POLICY "Users can view results" ON public.results
  FOR SELECT USING (game_id IN (SELECT id FROM public.games WHERE company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert/update results" ON public.results
  FOR ALL USING (game_id IN (SELECT id FROM public.games WHERE company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())));

-- ==========================================
-- 5. FUNCTION TRIGGER (Company Default)
-- ==========================================
-- Asignar automáticamente el company_id del usuario si viene nulo en la subida (push)
CREATE OR REPLACE FUNCTION set_default_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_set_games_company
  BEFORE INSERT ON public.games
  FOR EACH ROW EXECUTE FUNCTION set_default_company_id();
