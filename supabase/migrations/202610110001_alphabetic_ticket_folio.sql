-- Existing tickets keep their folios; retries return the original ticket.
BEGIN;
CREATE OR REPLACE FUNCTION public.pos_create_sale(p_company_id uuid,p_request_id text,p_client text,p_items jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_ticket text := gen_random_uuid()::text; v_session text; v_total numeric := 0; v_amount numeric; v_number text; item jsonb; g public.games; v_zone text; old public.tickets; v_payload jsonb; v_schedule public.draw_schedules; v_matches integer;
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
  -- Ten uppercase letters, with collision checks under the company lock.
  LOOP
    SELECT string_agg(chr(65 + (get_byte(uuid_send(gen_random_uuid()), 0) % 26)), '' ORDER BY n)
      INTO v_number FROM generate_series(1,10) AS n;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.tickets WHERE company_id=p_company_id AND ticket_number=v_number);
  END LOOP;
  INSERT INTO public.tickets(id,company_id,ticket_number,client,total_amount,status,cash_session_id,request_id,request_payload) VALUES(v_ticket,p_company_id,v_number,p_client,v_total,'active',v_session,p_request_id,v_payload);
  INSERT INTO public.ticket_items(id,company_id,ticket_id,game_id,number,amount,schedule,multiplier_snapshot)
    SELECT gen_random_uuid()::text,p_company_id,v_ticket,i->>'gameId',i->>'number',(i->>'amount')::numeric,i->>'schedule',catalog.multiplier FROM jsonb_array_elements(p_items) i JOIN public.games catalog ON catalog.id=i->>'gameId' AND catalog.company_id=p_company_id;
  UPDATE public.cash_sessions SET sales_total=sales_total+v_total,updated_at=now() WHERE id=v_session;
  INSERT INTO public.cash_movements(id,company_id,cash_session_id,type,amount,description,reference_id) VALUES(gen_random_uuid()::text,p_company_id,v_session,'sale',v_total,'Venta',v_ticket);
  RETURN v_ticket;
END $$;
COMMIT;
