-- Apply once to existing installations after a backup and the checks in SUPABASE_SETUP.md.
-- No data is deleted or financially reconciled automatically. Inconsistent legacy data
-- makes the transaction fail, instead of installing only part of the safeguards.
BEGIN;
CREATE SCHEMA IF NOT EXISTS pos_private;
REVOKE ALL ON SCHEMA pos_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA pos_private TO authenticated;

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'UTC';
ALTER TABLE public.company_users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.company_users ADD COLUMN IF NOT EXISTS display_name text;
UPDATE public.company_users SET role = lower(role) WHERE role IS NOT NULL;
ALTER TABLE public.company_users ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.company_users ADD CONSTRAINT company_users_valid_role CHECK (role IN ('owner','admin','manager','user'));

ALTER TABLE public.draw_schedules ADD COLUMN IF NOT EXISTS company_id uuid;
UPDATE public.draw_schedules s SET company_id = g.company_id FROM public.games g WHERE s.game_id = g.id AND s.company_id IS NULL;
ALTER TABLE public.draw_schedules ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS ticket_item_id text;
ALTER TABLE public.ticket_items ADD COLUMN IF NOT EXISTS multiplier_snapshot numeric(18,4);
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS draw_day date;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS cash_session_id text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS request_id text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS request_payload jsonb;
ALTER TABLE public.cash_movements ADD COLUMN IF NOT EXISTS reference_id text;
ALTER TABLE public.settings ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

CREATE TABLE IF NOT EXISTS public.company_user_access (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  manager_user_id uuid NOT NULL,
  managed_user_id uuid NOT NULL,
  granted_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id,manager_user_id,managed_user_id),
  FOREIGN KEY (company_id,manager_user_id) REFERENCES public.company_users(company_id,user_id) ON DELETE CASCADE,
  FOREIGN KEY (company_id,managed_user_id) REFERENCES public.company_users(company_id,user_id) ON DELETE CASCADE,
  CHECK (manager_user_id <> managed_user_id)
);

-- Fixed precision for money; NaN/Infinity are rejected below and by RPC validation.
ALTER TABLE public.tickets ALTER COLUMN total_amount TYPE numeric(18,2) USING round(total_amount::numeric,2);
ALTER TABLE public.ticket_items ALTER COLUMN amount TYPE numeric(18,2) USING round(amount::numeric,2);
ALTER TABLE public.winners ALTER COLUMN prize_amount TYPE numeric(18,2) USING round(prize_amount::numeric,2);
ALTER TABLE public.cash_sessions ALTER COLUMN opening_amount TYPE numeric(18,2) USING round(opening_amount::numeric,2);
ALTER TABLE public.cash_sessions ALTER COLUMN closing_amount TYPE numeric(18,2) USING round(closing_amount::numeric,2);
ALTER TABLE public.cash_sessions ALTER COLUMN sales_total TYPE numeric(18,2) USING round(sales_total::numeric,2);
ALTER TABLE public.cash_sessions ALTER COLUMN prizes_total TYPE numeric(18,2) USING round(prizes_total::numeric,2);
ALTER TABLE public.cash_movements ALTER COLUMN amount TYPE numeric(18,2) USING round(amount::numeric,2);
ALTER TABLE public.cancellation_logs ALTER COLUMN total_amount TYPE numeric(18,2) USING round(total_amount::numeric,2);
ALTER TABLE public.games ALTER COLUMN multiplier TYPE numeric(18,4) USING multiplier::numeric;

CREATE OR REPLACE FUNCTION pos_private.is_member(p_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.company_users WHERE company_id = p_company_id AND user_id = auth.uid()
  );
$$;
CREATE OR REPLACE FUNCTION pos_private.has_role(p_company_id uuid, p_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.company_users WHERE company_id = p_company_id AND user_id = auth.uid() AND role = ANY(p_roles)
  );
$$;
REVOKE ALL ON FUNCTION pos_private.is_member(uuid), pos_private.has_role(uuid,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION pos_private.is_member(uuid), pos_private.has_role(uuid,text[]) TO authenticated;

-- Replace every legacy policy on these application-owned tables. Permissive
-- policies otherwise combine with OR and can leave the previous bypass active.
DO $$
DECLARE p record; t text;
BEGIN
  FOR p IN SELECT schemaname,tablename,policyname FROM pg_policies
    WHERE schemaname='public' AND tablename = ANY(ARRAY['companies','company_users','company_user_access','games','draw_schedules','results','tickets','ticket_items','winners','cash_sessions','cash_movements','settings','cancellation_logs','app_error_logs'])
  LOOP EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename); END LOOP;
  FOR t IN SELECT unnest(ARRAY['companies','company_users','company_user_access','games','draw_schedules','results','tickets','ticket_items','winners','cash_sessions','cash_movements','settings','cancellation_logs','app_error_logs'])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',t);
    EXECUTE (SELECT format('REVOKE SELECT (%s), INSERT (%s), UPDATE (%s), REFERENCES (%s) ON TABLE public.%I FROM PUBLIC, anon, authenticated',string_agg(quote_ident(column_name),','),string_agg(quote_ident(column_name),','),string_agg(quote_ident(column_name),','),string_agg(quote_ident(column_name),','),t) FROM information_schema.columns WHERE table_schema='public' AND table_name=t);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated',t);
  END LOOP;
END $$;
CREATE POLICY company_read ON public.companies FOR SELECT TO authenticated USING (pos_private.is_member(id));
CREATE POLICY company_create ON public.companies FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY company_update ON public.companies FOR UPDATE TO authenticated USING (pos_private.has_role(id,ARRAY['owner','admin'])) WITH CHECK (pos_private.has_role(id,ARRAY['owner','admin']));
GRANT INSERT(name), UPDATE(name) ON public.companies TO authenticated;
CREATE POLICY member_read ON public.company_users FOR SELECT TO authenticated USING (user_id=auth.uid() OR pos_private.has_role(company_id,ARRAY['owner','admin']));
CREATE POLICY access_read ON public.company_user_access FOR SELECT TO authenticated USING (pos_private.has_role(company_id,ARRAY['owner','admin']) OR manager_user_id=auth.uid());
CREATE POLICY access_write ON public.company_user_access FOR ALL TO authenticated USING (pos_private.has_role(company_id,ARRAY['owner','admin'])) WITH CHECK (pos_private.has_role(company_id,ARRAY['owner','admin']) AND granted_by_user_id=auth.uid());
GRANT INSERT,UPDATE,DELETE ON public.company_user_access TO authenticated;
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['games','draw_schedules','results','tickets','ticket_items','winners','cash_sessions','cash_movements','settings','cancellation_logs','app_error_logs']) LOOP
    EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING (pos_private.is_member(company_id))',t);
  END LOOP;
  FOR t IN SELECT unnest(ARRAY['games','draw_schedules','results','settings']) LOOP
    EXECUTE format('CREATE POLICY admin_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (pos_private.has_role(company_id,ARRAY[''owner'',''admin'']))',t);
    EXECUTE format('CREATE POLICY admin_update ON public.%I FOR UPDATE TO authenticated USING (pos_private.has_role(company_id,ARRAY[''owner'',''admin''])) WITH CHECK (pos_private.has_role(company_id,ARRAY[''owner'',''admin'']))',t);
    EXECUTE format('GRANT INSERT, UPDATE ON public.%I TO authenticated',t);
  END LOOP;
END $$;
-- Results may be added by managers, but processed state is only written by RPC.
DROP POLICY admin_insert ON public.results;
CREATE POLICY result_insert ON public.results FOR INSERT TO authenticated WITH CHECK (pos_private.has_role(company_id,ARRAY['owner','admin','manager']) AND is_processed=0);
REVOKE UPDATE ON public.results FROM authenticated;
GRANT UPDATE(deleted_at,updated_at) ON public.results TO authenticated;
CREATE POLICY error_insert ON public.app_error_logs FOR INSERT TO authenticated WITH CHECK (pos_private.is_member(company_id));
GRANT INSERT ON public.app_error_logs TO authenticated;

-- Remove legacy ambiguous tenant defaults and unsafe aggregate RPCs.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT event_object_table,trigger_name FROM information_schema.triggers
    WHERE trigger_schema='public' AND trigger_name LIKE 'trigger_set_%_company'
  LOOP EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I',t.trigger_name,t.event_object_table); END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.set_default_company_id();
DROP FUNCTION IF EXISTS public.get_sales_report(timestamptz,timestamptz);
DROP FUNCTION IF EXISTS public.get_game_stats(timestamptz,timestamptz);
DROP FUNCTION IF EXISTS public.get_hot_cold_numbers(text,integer);

CREATE OR REPLACE FUNCTION public.set_company_owner_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.company_users(company_id,user_id,role) VALUES(NEW.id,auth.uid(),'owner');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.set_company_owner_membership() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS company_owner_membership ON public.companies;
CREATE TRIGGER company_owner_membership AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_company_owner_membership();

-- Fail migration on legacy null/mismatched tenants. Never guess a tenant.
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['games','results','tickets','ticket_items','winners','cash_sessions','cash_movements','settings','cancellation_logs','app_error_logs']) LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET NOT NULL',t);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE(id,company_id)',t,t||'_id_company_unique');
  END LOOP;
END $$;
-- Keep exactly one FK per relationship so PostgREST embedded joins are unambiguous.
ALTER TABLE public.draw_schedules DROP CONSTRAINT IF EXISTS draw_schedules_game_id_fkey;
ALTER TABLE public.results DROP CONSTRAINT IF EXISTS results_game_id_fkey;
ALTER TABLE public.results DROP CONSTRAINT IF EXISTS results_schedule_id_fkey;
ALTER TABLE public.ticket_items DROP CONSTRAINT IF EXISTS ticket_items_ticket_id_fkey;
ALTER TABLE public.ticket_items DROP CONSTRAINT IF EXISTS ticket_items_game_id_fkey;
ALTER TABLE public.winners DROP CONSTRAINT IF EXISTS winners_ticket_id_fkey;
ALTER TABLE public.winners DROP CONSTRAINT IF EXISTS winners_result_id_fkey;
ALTER TABLE public.cash_movements DROP CONSTRAINT IF EXISTS cash_movements_cash_session_id_fkey;
ALTER TABLE public.cancellation_logs DROP CONSTRAINT IF EXISTS cancellation_logs_ticket_id_fkey;
ALTER TABLE public.draw_schedules ADD CONSTRAINT schedules_id_company_unique UNIQUE(id,company_id);
ALTER TABLE public.draw_schedules ADD CONSTRAINT schedules_game_tenant FOREIGN KEY(game_id,company_id) REFERENCES public.games(id,company_id) ON DELETE CASCADE;
ALTER TABLE public.draw_schedules ADD CONSTRAINT schedules_company FOREIGN KEY(company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.results ADD CONSTRAINT results_game_tenant FOREIGN KEY(game_id,company_id) REFERENCES public.games(id,company_id);
ALTER TABLE public.results ADD CONSTRAINT results_schedule_tenant FOREIGN KEY(schedule_id,company_id) REFERENCES public.draw_schedules(id,company_id);
ALTER TABLE public.ticket_items ADD CONSTRAINT items_ticket_tenant FOREIGN KEY(ticket_id,company_id) REFERENCES public.tickets(id,company_id);
ALTER TABLE public.ticket_items ADD CONSTRAINT items_game_tenant FOREIGN KEY(game_id,company_id) REFERENCES public.games(id,company_id);
ALTER TABLE public.winners ADD CONSTRAINT winners_ticket_tenant FOREIGN KEY(ticket_id,company_id) REFERENCES public.tickets(id,company_id);
ALTER TABLE public.winners ADD CONSTRAINT winners_result_tenant FOREIGN KEY(result_id,company_id) REFERENCES public.results(id,company_id);
ALTER TABLE public.winners ADD CONSTRAINT winners_item_tenant FOREIGN KEY(ticket_item_id,company_id) REFERENCES public.ticket_items(id,company_id);
ALTER TABLE public.cash_movements ADD CONSTRAINT movement_session_tenant FOREIGN KEY(cash_session_id,company_id) REFERENCES public.cash_sessions(id,company_id);
ALTER TABLE public.tickets ADD CONSTRAINT ticket_session_tenant FOREIGN KEY(cash_session_id,company_id) REFERENCES public.cash_sessions(id,company_id);
ALTER TABLE public.cancellation_logs ADD CONSTRAINT cancellation_ticket_tenant FOREIGN KEY(ticket_id,company_id) REFERENCES public.tickets(id,company_id);
ALTER TABLE public.tickets ADD CONSTRAINT tickets_number_unique UNIQUE(company_id,ticket_number);
ALTER TABLE public.tickets ADD CONSTRAINT tickets_request_unique UNIQUE(company_id,request_id);
ALTER TABLE public.winners ADD CONSTRAINT winner_item_unique UNIQUE(result_id,ticket_item_id);
CREATE UNIQUE INDEX cash_one_open ON public.cash_sessions(company_id) WHERE status='open';
CREATE UNIQUE INDEX cash_reference_unique ON public.cash_movements(company_id,type,reference_id) WHERE reference_id IS NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN total_amount SET NOT NULL;
ALTER TABLE public.ticket_items ALTER COLUMN amount SET NOT NULL;
ALTER TABLE public.winners ALTER COLUMN prize_amount SET NOT NULL;
ALTER TABLE public.games ALTER COLUMN multiplier SET NOT NULL;
ALTER TABLE public.cash_sessions ALTER COLUMN opening_amount SET NOT NULL;
ALTER TABLE public.cash_sessions ALTER COLUMN sales_total SET NOT NULL;
ALTER TABLE public.cash_sessions ALTER COLUMN prizes_total SET NOT NULL;
ALTER TABLE public.cash_movements ALTER COLUMN amount SET NOT NULL;
ALTER TABLE public.tickets ADD CONSTRAINT ticket_amount_positive CHECK(total_amount > 0 AND total_amount <> 'NaN'::numeric);
ALTER TABLE public.ticket_items ADD CONSTRAINT item_amount_positive CHECK(amount > 0 AND amount <> 'NaN'::numeric);
ALTER TABLE public.winners ADD CONSTRAINT prize_positive CHECK(prize_amount > 0 AND prize_amount <> 'NaN'::numeric);
ALTER TABLE public.games ADD CONSTRAINT multiplier_positive CHECK(multiplier > 0 AND multiplier <> 'NaN'::numeric);

-- A company row is the shared lock for all financial operations. This serializes
-- sale/close/cancel/pay/process within that tenant, not unrelated tenants.
CREATE OR REPLACE FUNCTION pos_private.lock_company(p_company_id uuid,p_roles text[] DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT pos_private.is_member(p_company_id) OR (p_roles IS NOT NULL AND NOT pos_private.has_role(p_company_id,p_roles)) THEN
    RAISE EXCEPTION 'No tienes permisos para esta empresa u operación' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.companies WHERE id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa no encontrada'; END IF;
  IF NOT pos_private.is_member(p_company_id) OR (p_roles IS NOT NULL AND NOT pos_private.has_role(p_company_id,p_roles)) THEN
    RAISE EXCEPTION 'Permisos cambiados durante la operación' USING ERRCODE='42501';
  END IF;
END $$;
REVOKE ALL ON FUNCTION pos_private.lock_company(uuid,text[]) FROM PUBLIC, anon, authenticated;

-- Active draws are unique. The trigger also rejects reuse of archived draw keys,
-- while allowing audited historical duplicate rows to remain archived.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.companies c WHERE NOT EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=c.time_zone)) THEN RAISE EXCEPTION 'Configura una zona horaria IANA válida para cada empresa'; END IF;
END $$;
UPDATE public.results r SET draw_day=(r.draw_date AT TIME ZONE c.time_zone)::date FROM public.companies c WHERE c.id=r.company_id;
ALTER TABLE public.results ALTER COLUMN draw_day SET NOT NULL;
CREATE UNIQUE INDEX result_draw_unique ON public.results(company_id,game_id,schedule_id,draw_day) WHERE deleted_at IS NULL;
CREATE OR REPLACE FUNCTION pos_private.guard_result()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_zone text;
BEGIN
  IF auth.uid() IS NOT NULL THEN PERFORM pos_private.lock_company(NEW.company_id,ARRAY['owner','admin','manager']); END IF;
  IF TG_OP='UPDATE' AND OLD.is_processed=1 AND (NEW.company_id,NEW.game_id,NEW.schedule_id,NEW.winning_number,NEW.draw_date,NEW.deleted_at,NEW.is_processed) IS DISTINCT FROM (OLD.company_id,OLD.game_id,OLD.schedule_id,OLD.winning_number,OLD.draw_date,OLD.deleted_at,OLD.is_processed) THEN
    RAISE EXCEPTION 'No se puede cambiar u ocultar un resultado procesado';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.draw_schedules WHERE id=NEW.schedule_id AND game_id=NEW.game_id AND company_id=NEW.company_id) THEN RAISE EXCEPTION 'Horario de otra empresa o juego'; END IF;
  SELECT time_zone INTO v_zone FROM public.companies WHERE id=NEW.company_id;
  NEW.draw_day := (NEW.draw_date AT TIME ZONE v_zone)::date;
  IF TG_OP='INSERT' OR (NEW.company_id,NEW.game_id,NEW.schedule_id,NEW.draw_day) IS DISTINCT FROM (OLD.company_id,OLD.game_id,OLD.schedule_id,OLD.draw_day) THEN
    IF EXISTS(SELECT 1 FROM public.results r WHERE r.company_id=NEW.company_id AND r.game_id=NEW.game_id AND r.schedule_id=NEW.schedule_id AND r.draw_day=NEW.draw_day AND r.id<>NEW.id) THEN
      RAISE EXCEPTION 'Ya existe un resultado para este sorteo y fecha' USING ERRCODE='23505';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pos_private.guard_result() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_result BEFORE INSERT OR UPDATE ON public.results FOR EACH ROW EXECUTE FUNCTION pos_private.guard_result();

CREATE OR REPLACE FUNCTION public.pos_set_member_role(p_company_id uuid,p_user_id uuid,p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM pos_private.lock_company(p_company_id,ARRAY['owner','admin']);
  IF p_role IS NULL OR p_role NOT IN ('user','manager','admin') OR p_user_id=auth.uid() THEN RAISE EXCEPTION 'Cambio de rol no permitido'; END IF;
  IF p_role='admin' AND NOT pos_private.has_role(p_company_id,ARRAY['owner']) THEN RAISE EXCEPTION 'Solo el propietario puede asignar administradores'; END IF;
  UPDATE public.company_users SET role=p_role WHERE company_id=p_company_id AND user_id=p_user_id AND role <> 'owner'
    AND (role <> 'admin' OR pos_private.has_role(p_company_id,ARRAY['owner']));
  IF NOT FOUND THEN RAISE EXCEPTION 'Miembro no encontrado o rol protegido'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.pos_open_cash(p_company_id uuid,p_opening_amount numeric)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id text := gen_random_uuid()::text;
BEGIN
  PERFORM pos_private.lock_company(p_company_id);
  IF p_opening_amount IS NULL OR p_opening_amount < 0 OR p_opening_amount::text IN ('NaN','Infinity','-Infinity') OR p_opening_amount <> round(p_opening_amount,2) THEN RAISE EXCEPTION 'Monto de apertura inválido'; END IF;
  IF EXISTS(SELECT 1 FROM public.cash_sessions WHERE company_id=p_company_id AND status='open') THEN RAISE EXCEPTION 'Ya existe una caja abierta'; END IF;
  INSERT INTO public.cash_sessions(id,company_id,opening_amount,sales_total,prizes_total,status) VALUES(v_id,p_company_id,p_opening_amount,0,0,'open');
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.pos_cash_summary(p_company_id uuid,p_session_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.cash_sessions; incomes numeric; expenses numeric;
BEGIN
  IF NOT pos_private.is_member(p_company_id) THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE='42501'; END IF;
  SELECT * INTO s FROM public.cash_sessions WHERE company_id=p_company_id AND (id=p_session_id OR (p_session_id IS NULL AND status='open'));
  IF NOT FOUND THEN
    IF p_session_id IS NOT NULL THEN RAISE EXCEPTION 'Caja no encontrada'; END IF;
    RETURN jsonb_build_object('openingAmount',0,'salesTotal',0,'prizesTotal',0,'incomeTotal',0,'expenseTotal',0,'balance',0);
  END IF;
  SELECT coalesce(sum(amount) FILTER(WHERE type='income'),0),coalesce(sum(amount) FILTER(WHERE type='expense'),0) INTO incomes,expenses FROM public.cash_movements WHERE company_id=p_company_id AND cash_session_id=s.id;
  RETURN jsonb_build_object('openingAmount',s.opening_amount,'salesTotal',s.sales_total,'prizesTotal',s.prizes_total,'incomeTotal',incomes,'expenseTotal',expenses,'balance',s.opening_amount+s.sales_total-s.prizes_total+incomes-expenses);
END $$;

CREATE OR REPLACE FUNCTION public.pos_close_cash(p_company_id uuid,p_session_id text,p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_summary jsonb;
BEGIN
  PERFORM pos_private.lock_company(p_company_id);
  IF NOT EXISTS(SELECT 1 FROM public.cash_sessions WHERE id=p_session_id AND company_id=p_company_id AND status='open') THEN RAISE EXCEPTION 'Caja no encontrada o cerrada'; END IF;
  v_summary := public.pos_cash_summary(p_company_id,p_session_id);
  UPDATE public.cash_sessions SET status='closed',closing_amount=(v_summary->>'balance')::numeric,closed_at=now(),notes=p_notes,updated_at=now() WHERE id=p_session_id AND company_id=p_company_id;
END $$;

CREATE OR REPLACE FUNCTION public.pos_add_cash_movement(p_company_id uuid,p_session_id text,p_type text,p_amount numeric,p_description text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id text := gen_random_uuid()::text;
BEGIN
  PERFORM pos_private.lock_company(p_company_id);
  IF p_type IS NULL OR p_type NOT IN ('income','expense') OR p_amount IS NULL OR p_amount <= 0 OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount <> round(p_amount,2) OR nullif(btrim(p_description),'') IS NULL THEN RAISE EXCEPTION 'Movimiento inválido'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.cash_sessions WHERE id=p_session_id AND company_id=p_company_id AND status='open') THEN RAISE EXCEPTION 'Caja no encontrada o cerrada'; END IF;
  INSERT INTO public.cash_movements(id,company_id,cash_session_id,type,amount,description) VALUES(v_id,p_company_id,p_session_id,p_type,p_amount,p_description);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.pos_create_sale(p_company_id uuid,p_request_id text,p_client text,p_items jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_ticket text := gen_random_uuid()::text; v_session text; v_total numeric := 0; v_amount numeric; v_number bigint; item jsonb; g public.games; v_zone text; old public.tickets; v_payload jsonb; v_schedule public.draw_schedules; v_matches integer;
BEGIN
  PERFORM pos_private.lock_company(p_company_id);
  IF nullif(btrim(p_request_id),'') IS NULL OR length(p_request_id)>128 THEN RAISE EXCEPTION 'Identificador de venta inválido'; END IF;
  v_payload := jsonb_build_object('client',p_client,'items',p_items);
  SELECT * INTO old FROM public.tickets WHERE company_id=p_company_id AND request_id=p_request_id;
  IF FOUND THEN
    IF old.request_payload IS DISTINCT FROM v_payload THEN RAISE EXCEPTION 'La solicitud de venta ya fue usada con otros datos'; END IF;
    RETURN old.id;
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Carrito inválido'; END IF;
  SELECT id INTO v_session FROM public.cash_sessions WHERE company_id=p_company_id AND status='open';
  IF v_session IS NULL THEN RAISE EXCEPTION 'Abre la caja antes de vender'; END IF;
  SELECT time_zone INTO v_zone FROM public.companies WHERE id=p_company_id;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO g FROM public.games WHERE id=item->>'gameId' AND company_id=p_company_id AND is_active=1 AND deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Juego inválido o de otra empresa'; END IF;
    IF item->>'number' IS NULL OR item->>'number' !~ '^[0-9]+$' OR length(item->>'number') <> g.digit_count THEN RAISE EXCEPTION 'Número de jugada inválido'; END IF;
    v_amount := (item->>'amount')::numeric;
    IF v_amount IS NULL OR v_amount <= 0 OR v_amount::text IN ('NaN','Infinity','-Infinity') OR v_amount <> round(v_amount,2) THEN RAISE EXCEPTION 'Monto de jugada inválido'; END IF;
    SELECT count(*) INTO v_matches FROM public.draw_schedules WHERE game_id=g.id AND company_id=p_company_id AND is_active=1 AND deleted_at IS NULL AND (time=item->>'schedule' OR name=item->>'schedule');
    IF v_matches <> 1 THEN RAISE EXCEPTION 'Horario de jugada inválido o ambiguo'; END IF;
    SELECT * INTO v_schedule FROM public.draw_schedules WHERE game_id=g.id AND company_id=p_company_id AND is_active=1 AND deleted_at IS NULL AND (time=item->>'schedule' OR name=item->>'schedule');
    IF v_schedule.time IS NULL OR v_schedule.time !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' THEN RAISE EXCEPTION 'Configura una hora de sorteo válida'; END IF;
    IF (clock_timestamp() AT TIME ZONE v_zone)::time >= v_schedule.time::time THEN RAISE EXCEPTION 'La venta para este sorteo ya está cerrada'; END IF;
    IF EXISTS(SELECT 1 FROM public.results r JOIN public.draw_schedules s ON s.id=r.schedule_id WHERE r.company_id=p_company_id AND r.game_id=g.id AND (s.time=item->>'schedule' OR s.name=item->>'schedule') AND (r.draw_date AT TIME ZONE v_zone)::date=(now() AT TIME ZONE v_zone)::date) THEN RAISE EXCEPTION 'El resultado del sorteo ya está registrado'; END IF;
    v_total := v_total + v_amount;
  END LOOP;
  SELECT coalesce(max(substring(ticket_number from '^#([0-9]+)$')::bigint),0)+1 INTO v_number FROM public.tickets WHERE company_id=p_company_id;
  INSERT INTO public.tickets(id,company_id,ticket_number,client,total_amount,status,cash_session_id,request_id,request_payload) VALUES(v_ticket,p_company_id,'#'||lpad(v_number::text,greatest(8,length(v_number::text)),'0'),p_client,v_total,'active',v_session,p_request_id,v_payload);
  INSERT INTO public.ticket_items(id,company_id,ticket_id,game_id,number,amount,schedule,multiplier_snapshot)
    SELECT gen_random_uuid()::text,p_company_id,v_ticket,i->>'gameId',i->>'number',(i->>'amount')::numeric,i->>'schedule',catalog.multiplier FROM jsonb_array_elements(p_items) i JOIN public.games catalog ON catalog.id=i->>'gameId' AND catalog.company_id=p_company_id;
  UPDATE public.cash_sessions SET sales_total=sales_total+v_total,updated_at=now() WHERE id=v_session;
  INSERT INTO public.cash_movements(id,company_id,cash_session_id,type,amount,description,reference_id) VALUES(gen_random_uuid()::text,p_company_id,v_session,'sale',v_total,'Venta',v_ticket);
  RETURN v_ticket;
END $$;

CREATE OR REPLACE FUNCTION public.pos_cancel_ticket(p_company_id uuid,p_ticket_id text,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.tickets; v_items text;
BEGIN
  PERFORM pos_private.lock_company(p_company_id,ARRAY['owner','admin','manager']);
  SELECT * INTO t FROM public.tickets WHERE id=p_ticket_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket no encontrado'; END IF;
  IF t.status='cancelled' THEN RETURN; END IF;
  IF t.status <> 'active' OR EXISTS(SELECT 1 FROM public.winners WHERE ticket_id=t.id) THEN RAISE EXCEPTION 'No se puede anular un ticket con premios o pagado'; END IF;
  IF nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Indica el motivo de anulación'; END IF;
  IF t.cash_session_id IS NULL THEN RAISE EXCEPTION 'Ticket anterior a la migración: reconciliar su caja antes de anular'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.cash_sessions WHERE id=t.cash_session_id AND company_id=p_company_id AND status='open') THEN RAISE EXCEPTION 'La caja original del ticket está cerrada'; END IF;
  UPDATE public.tickets SET status='cancelled',cancel_reason=p_reason,cancelled_at=now(),updated_at=now() WHERE id=t.id;
  SELECT coalesce(jsonb_agg(to_jsonb(i)),'[]'::jsonb)::text INTO v_items FROM public.ticket_items i WHERE ticket_id=t.id;
  INSERT INTO public.cancellation_logs(id,company_id,ticket_id,ticket_number,total_amount,reason,items_json) VALUES(gen_random_uuid()::text,p_company_id,t.id,t.ticket_number,t.total_amount,p_reason,v_items);
  -- Reverse sales once. A separate expense would double-count the refund.
  UPDATE public.cash_sessions SET sales_total=sales_total-t.total_amount,updated_at=now() WHERE id=t.cash_session_id;
  INSERT INTO public.cash_movements(id,company_id,cash_session_id,type,amount,description,reference_id) VALUES(gen_random_uuid()::text,p_company_id,t.cash_session_id,'sale_refund',t.total_amount,p_reason,t.id);
END $$;

CREATE OR REPLACE FUNCTION public.pos_pay_winner(p_company_id uuid,p_winner_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE w public.winners; v_session text;
BEGIN
  PERFORM pos_private.lock_company(p_company_id,ARRAY['owner','admin','manager']);
  SELECT * INTO w FROM public.winners WHERE id=p_winner_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Premio no encontrado'; END IF;
  IF w.is_paid=1 THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.tickets WHERE id=w.ticket_id AND company_id=p_company_id AND status='active') THEN RAISE EXCEPTION 'Ticket anulado o inválido'; END IF;
  SELECT id INTO v_session FROM public.cash_sessions WHERE company_id=p_company_id AND status='open';
  IF v_session IS NULL THEN RAISE EXCEPTION 'Abre la caja antes de pagar'; END IF;
  UPDATE public.winners SET is_paid=1,paid_at=now(),updated_at=now() WHERE id=w.id;
  UPDATE public.cash_sessions SET prizes_total=prizes_total+w.prize_amount,updated_at=now() WHERE id=v_session;
  INSERT INTO public.cash_movements(id,company_id,cash_session_id,type,amount,description,reference_id) VALUES(gen_random_uuid()::text,p_company_id,v_session,'prize_payment',w.prize_amount,'Pago de premio',w.id);
END $$;

CREATE OR REPLACE FUNCTION public.pos_process_result(p_company_id uuid,p_result_id text,p_timezone text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.results; s public.draw_schedules; g public.games; v_zone text; v_count integer;
BEGIN
  PERFORM pos_private.lock_company(p_company_id,ARRAY['owner','admin','manager']);
  SELECT * INTO r FROM public.results WHERE id=p_result_id AND company_id=p_company_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resultado no encontrado'; END IF;
  IF r.is_processed=1 THEN SELECT count(*) INTO v_count FROM public.winners WHERE result_id=r.id; RETURN v_count; END IF;
  SELECT * INTO s FROM public.draw_schedules WHERE id=r.schedule_id AND game_id=r.game_id AND company_id=p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Horario inválido para este resultado'; END IF;
  SELECT * INTO g FROM public.games WHERE id=r.game_id AND company_id=p_company_id;
  IF NOT FOUND OR r.winning_number IS NULL OR r.winning_number !~ '^[0-9]+$' OR length(r.winning_number) <> g.digit_count OR r.draw_date IS NULL THEN RAISE EXCEPTION 'Resultado inválido'; END IF;
  SELECT time_zone INTO v_zone FROM public.companies WHERE id=p_company_id;
  IF p_timezone IS NOT NULL AND p_timezone<>v_zone THEN RAISE EXCEPTION 'La zona horaria debe coincidir con la empresa'; END IF;
  INSERT INTO public.winners(id,company_id,ticket_id,ticket_item_id,result_id,prize_amount,is_paid)
    SELECT gen_random_uuid()::text,p_company_id,i.ticket_id,i.id,r.id,round(i.amount*coalesce(i.multiplier_snapshot,g.multiplier),2),0
    FROM public.ticket_items i JOIN public.tickets t ON t.id=i.ticket_id
    WHERE i.company_id=p_company_id AND t.company_id=p_company_id AND t.status='active' AND i.game_id=r.game_id AND i.number=r.winning_number
      AND i.schedule IN (s.time,s.name) AND (t.created_at AT TIME ZONE v_zone)::date=(r.draw_date AT TIME ZONE v_zone)::date
    ON CONFLICT(result_id,ticket_item_id) DO NOTHING;
  SELECT count(*) INTO v_count FROM public.winners WHERE result_id=r.id;
  UPDATE public.results SET is_processed=1,updated_at=now() WHERE id=r.id;
  RETURN v_count;
END $$;

CREATE OR REPLACE FUNCTION public.pos_sales_report(p_company_id uuid,p_start timestamptz DEFAULT NULL,p_end timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE sales numeric; tickets bigint; prizes numeric; paid numeric;
BEGIN
  IF NOT pos_private.is_member(p_company_id) THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE='42501'; END IF;
  SELECT coalesce(sum(total_amount),0),count(*) INTO sales,tickets FROM public.tickets WHERE company_id=p_company_id AND status='active' AND (p_start IS NULL OR created_at>=p_start) AND (p_end IS NULL OR created_at<=p_end);
  SELECT coalesce(sum(w.prize_amount),0),coalesce(sum(w.prize_amount) FILTER(WHERE w.is_paid=1),0) INTO prizes,paid FROM public.winners w JOIN public.tickets t ON t.id=w.ticket_id WHERE w.company_id=p_company_id AND t.status='active' AND (p_start IS NULL OR w.created_at>=p_start) AND (p_end IS NULL OR w.created_at<=p_end);
  RETURN jsonb_build_object('totalSales',sales,'totalTickets',tickets,'totalPrizes',prizes,'totalPaid',paid,'pendingPrizes',prizes-paid,'netProfit',sales-prizes);
END $$;

CREATE OR REPLACE FUNCTION public.pos_game_stats(p_company_id uuid,p_start timestamptz DEFAULT NULL,p_end timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE ret jsonb;
BEGIN
  IF NOT pos_private.is_member(p_company_id) THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE='42501'; END IF;
  WITH sales AS (
    SELECT i.game_id,sum(i.amount) total FROM public.ticket_items i JOIN public.tickets t ON t.id=i.ticket_id WHERE i.company_id=p_company_id AND t.status='active' AND (p_start IS NULL OR i.created_at>=p_start) AND (p_end IS NULL OR i.created_at<=p_end) GROUP BY i.game_id
  ), prizes AS (
    SELECT r.game_id,sum(w.prize_amount) total FROM public.winners w JOIN public.results r ON r.id=w.result_id JOIN public.tickets t ON t.id=w.ticket_id WHERE w.company_id=p_company_id AND t.status='active' AND (p_start IS NULL OR w.created_at>=p_start) AND (p_end IS NULL OR w.created_at<=p_end) GROUP BY r.game_id
  ) SELECT coalesce(jsonb_agg(jsonb_build_object('gameId',g.id,'gameName',g.name,'totalSales',coalesce(s.total,0),'totalPrizes',coalesce(p.total,0),'netProfit',coalesce(s.total,0)-coalesce(p.total,0)) ORDER BY g.name),'[]'::jsonb) INTO ret FROM public.games g LEFT JOIN sales s ON s.game_id=g.id LEFT JOIN prizes p ON p.game_id=g.id WHERE g.company_id=p_company_id AND (s.game_id IS NOT NULL OR p.game_id IS NOT NULL);
  RETURN ret;
END $$;

CREATE OR REPLACE FUNCTION public.pos_hot_cold_numbers(p_company_id uuid,p_game_id text DEFAULT NULL,p_limit integer DEFAULT 5)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE ret jsonb;
BEGIN
  IF NOT pos_private.is_member(p_company_id) THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE='42501'; END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Límite inválido'; END IF;
  WITH frequencies AS (
    SELECT winning_number number,count(*) frequency FROM public.results
    WHERE company_id=p_company_id AND deleted_at IS NULL AND (p_game_id IS NULL OR game_id=p_game_id)
    GROUP BY winning_number
  ), hot AS (SELECT *, 'hot'::text type FROM frequencies ORDER BY frequency DESC,number LIMIT p_limit),
     cold AS (SELECT *, 'cold'::text type FROM frequencies ORDER BY frequency ASC,number LIMIT p_limit)
  SELECT coalesce(jsonb_agg(to_jsonb(n)),'[]'::jsonb) INTO ret FROM (SELECT * FROM hot UNION ALL SELECT * FROM cold) n;
  RETURN ret;
END $$;

-- Functions are denied by default and only this audited API is exposed.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'pos_%' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
  END LOOP;
  FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.oid::regprocedure = ANY(ARRAY['public.pos_set_member_role(uuid,uuid,text)','public.pos_open_cash(uuid,numeric)','public.pos_cash_summary(uuid,text)','public.pos_close_cash(uuid,text,text)','public.pos_add_cash_movement(uuid,text,text,numeric,text)','public.pos_create_sale(uuid,text,text,jsonb)','public.pos_cancel_ticket(uuid,text,text)','public.pos_pay_winner(uuid,text)','public.pos_process_result(uuid,text,text)','public.pos_sales_report(uuid,timestamptz,timestamptz)','public.pos_game_stats(uuid,timestamptz,timestamptz)','public.pos_hot_cold_numbers(uuid,text,integer)']::regprocedure[]) LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
