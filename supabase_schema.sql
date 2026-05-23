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

-- TICKETS
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ticket_number TEXT,
  client TEXT,
  total_amount REAL,
  status TEXT DEFAULT 'active',
  cancel_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TICKET ITEMS
CREATE TABLE IF NOT EXISTS public.ticket_items (
  id TEXT PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ticket_id TEXT REFERENCES public.tickets(id) ON DELETE CASCADE,
  game_id TEXT REFERENCES public.games(id) ON DELETE CASCADE,
  number TEXT,
  amount REAL,
  schedule TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WINNERS
CREATE TABLE IF NOT EXISTS public.winners (
  id TEXT PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ticket_id TEXT REFERENCES public.tickets(id) ON DELETE CASCADE,
  result_id TEXT REFERENCES public.results(id) ON DELETE CASCADE,
  prize_amount REAL,
  is_paid INTEGER DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CASH SESSIONS
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id TEXT PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  opening_amount REAL,
  closing_amount REAL,
  sales_total REAL DEFAULT 0,
  prizes_total REAL DEFAULT 0,
  status TEXT DEFAULT 'open',
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CASH MOVEMENTS
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id TEXT PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  cash_session_id TEXT REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  type TEXT,
  amount REAL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SETTINGS
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  key TEXT UNIQUE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CANCELLATION LOGS
CREATE TABLE IF NOT EXISTS public.cancellation_logs (
  id TEXT PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ticket_id TEXT REFERENCES public.tickets(id) ON DELETE CASCADE,
  ticket_number TEXT,
  total_amount REAL,
  reason TEXT,
  items_json TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- APP ERROR LOGS
CREATE TABLE IF NOT EXISTS public.app_error_logs (
  id TEXT PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  severity TEXT DEFAULT 'error',
  source TEXT,
  message TEXT,
  stack TEXT,
  details TEXT,
  url TEXT,
  user_agent TEXT,
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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

CREATE INDEX IF NOT EXISTS idx_tickets_updated_at ON public.tickets(updated_at);
CREATE INDEX IF NOT EXISTS idx_tickets_company_id ON public.tickets(company_id);

CREATE INDEX IF NOT EXISTS idx_ticket_items_created_at ON public.ticket_items(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_items_ticket_id ON public.ticket_items(ticket_id);

CREATE INDEX IF NOT EXISTS idx_winners_updated_at ON public.winners(updated_at);
CREATE INDEX IF NOT EXISTS idx_winners_ticket_id ON public.winners(ticket_id);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_updated_at ON public.cash_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_company_id ON public.cash_sessions(company_id);

CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at ON public.cash_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_movements_cash_session_id ON public.cash_movements(cash_session_id);

CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON public.settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_settings_company_id ON public.settings(company_id);

CREATE INDEX IF NOT EXISTS idx_cancellation_logs_created_at ON public.cancellation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_cancellation_logs_ticket_id ON public.cancellation_logs(ticket_id);

CREATE INDEX IF NOT EXISTS idx_app_error_logs_created_at ON public.app_error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_company_id ON public.app_error_logs(company_id);


-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;

-- Políticas Companies (Aislar a los usuarios a sus empresas)
DROP POLICY IF EXISTS "Users can view their own companies" ON public.companies;
CREATE POLICY "Users can view their own companies" ON public.companies
  FOR SELECT USING (id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON public.companies;
CREATE POLICY "Users can update their own companies" ON public.companies
  FOR UPDATE USING (id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own companies" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.company_users;
CREATE POLICY "Users can view their own memberships" ON public.company_users
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own memberships" ON public.company_users;
DROP POLICY IF EXISTS "Users can update their own memberships" ON public.company_users;
CREATE POLICY "Users can update their own memberships" ON public.company_users
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can create their own memberships" ON public.company_users
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Políticas Games
DROP POLICY IF EXISTS "Users can view games of their company" ON public.games;
CREATE POLICY "Users can view games of their company" ON public.games
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert/update games of their company" ON public.games;
CREATE POLICY "Users can insert/update games of their company" ON public.games
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Políticas DrawSchedules
DROP POLICY IF EXISTS "Users can view schedules of their company games" ON public.draw_schedules;
CREATE POLICY "Users can view schedules of their company games" ON public.draw_schedules
  FOR SELECT USING (game_id IN (SELECT id FROM public.games WHERE company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "Users can insert/update schedules" ON public.draw_schedules;
CREATE POLICY "Users can insert/update schedules" ON public.draw_schedules
  FOR ALL USING (game_id IN (SELECT id FROM public.games WHERE company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())));

-- Políticas Results (Temporalmente laxas atadas a game_id para validación local)
DROP POLICY IF EXISTS "Users can view results" ON public.results;
CREATE POLICY "Users can view results" ON public.results
  FOR SELECT USING (game_id IN (SELECT id FROM public.games WHERE company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "Users can insert/update results" ON public.results;
CREATE POLICY "Users can insert/update results" ON public.results
  FOR ALL USING (game_id IN (SELECT id FROM public.games WHERE company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())));

-- Políticas Tickets
DROP POLICY IF EXISTS "Users can view tickets of their company" ON public.tickets;
CREATE POLICY "Users can view tickets of their company" ON public.tickets
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert/update tickets of their company" ON public.tickets;
CREATE POLICY "Users can insert/update tickets of their company" ON public.tickets
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Políticas TicketItems
DROP POLICY IF EXISTS "Users can view ticket items of their company" ON public.ticket_items;
CREATE POLICY "Users can view ticket items of their company" ON public.ticket_items
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert/update ticket items of their company" ON public.ticket_items;
CREATE POLICY "Users can insert/update ticket items of their company" ON public.ticket_items
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Políticas Winners
DROP POLICY IF EXISTS "Users can view winners of their company" ON public.winners;
CREATE POLICY "Users can view winners of their company" ON public.winners
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert/update winners of their company" ON public.winners;
CREATE POLICY "Users can insert/update winners of their company" ON public.winners
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Políticas CashSessions
DROP POLICY IF EXISTS "Users can view cash sessions of their company" ON public.cash_sessions;
CREATE POLICY "Users can view cash sessions of their company" ON public.cash_sessions
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert/update cash sessions of their company" ON public.cash_sessions;
CREATE POLICY "Users can insert/update cash sessions of their company" ON public.cash_sessions
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Políticas CashMovements
DROP POLICY IF EXISTS "Users can view cash movements of their company" ON public.cash_movements;
CREATE POLICY "Users can view cash movements of their company" ON public.cash_movements
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert/update cash movements of their company" ON public.cash_movements;
CREATE POLICY "Users can insert/update cash movements of their company" ON public.cash_movements
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Políticas Settings
DROP POLICY IF EXISTS "Users can view settings of their company" ON public.settings;
CREATE POLICY "Users can view settings of their company" ON public.settings
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert/update settings of their company" ON public.settings;
CREATE POLICY "Users can insert/update settings of their company" ON public.settings
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Políticas CancellationLogs
DROP POLICY IF EXISTS "Users can view cancellation logs of their company" ON public.cancellation_logs;
CREATE POLICY "Users can view cancellation logs of their company" ON public.cancellation_logs
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert/update cancellation logs of their company" ON public.cancellation_logs;
CREATE POLICY "Users can insert/update cancellation logs of their company" ON public.cancellation_logs
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Políticas AppErrorLogs
DROP POLICY IF EXISTS "Users can view app error logs of their company" ON public.app_error_logs;
CREATE POLICY "Users can view app error logs of their company" ON public.app_error_logs
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert/update app error logs of their company" ON public.app_error_logs;
CREATE POLICY "Users can insert/update app error logs of their company" ON public.app_error_logs
  FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

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

DROP TRIGGER IF EXISTS trigger_set_games_company ON public.games;
CREATE TRIGGER trigger_set_games_company
  BEFORE INSERT ON public.games
  FOR EACH ROW EXECUTE FUNCTION set_default_company_id();

DROP TRIGGER IF EXISTS trigger_set_tickets_company ON public.tickets;
CREATE TRIGGER trigger_set_tickets_company
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION set_default_company_id();

DROP TRIGGER IF EXISTS trigger_set_ticket_items_company ON public.ticket_items;
CREATE TRIGGER trigger_set_ticket_items_company
  BEFORE INSERT ON public.ticket_items
  FOR EACH ROW EXECUTE FUNCTION set_default_company_id();

DROP TRIGGER IF EXISTS trigger_set_winners_company ON public.winners;
CREATE TRIGGER trigger_set_winners_company
  BEFORE INSERT ON public.winners
  FOR EACH ROW EXECUTE FUNCTION set_default_company_id();

DROP TRIGGER IF EXISTS trigger_set_cash_sessions_company ON public.cash_sessions;
CREATE TRIGGER trigger_set_cash_sessions_company
  BEFORE INSERT ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION set_default_company_id();

DROP TRIGGER IF EXISTS trigger_set_cash_movements_company ON public.cash_movements;
CREATE TRIGGER trigger_set_cash_movements_company
  BEFORE INSERT ON public.cash_movements
  FOR EACH ROW EXECUTE FUNCTION set_default_company_id();

DROP TRIGGER IF EXISTS trigger_set_settings_company ON public.settings;
CREATE TRIGGER trigger_set_settings_company
  BEFORE INSERT ON public.settings
  FOR EACH ROW EXECUTE FUNCTION set_default_company_id();

DROP TRIGGER IF EXISTS trigger_set_cancellation_logs_company ON public.cancellation_logs;
CREATE TRIGGER trigger_set_cancellation_logs_company
  BEFORE INSERT ON public.cancellation_logs
  FOR EACH ROW EXECUTE FUNCTION set_default_company_id();

DROP TRIGGER IF EXISTS trigger_set_app_error_logs_company ON public.app_error_logs;
CREATE TRIGGER trigger_set_app_error_logs_company
  BEFORE INSERT ON public.app_error_logs
  FOR EACH ROW EXECUTE FUNCTION set_default_company_id();
