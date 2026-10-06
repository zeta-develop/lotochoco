-- Optional, audited preparation for legacy shared game configuration.
-- Run only inside the security migration transaction after a verified backup.
-- No rows are deleted, no money or tenant ownership is reassigned.
SET LOCAL lock_timeout='20s';
SET LOCAL statement_timeout='120s';
LOCK TABLE public.games,public.draw_schedules,public.ticket_items,public.tickets,public.results,public.winners,public.cash_sessions,public.cash_movements,public.company_users IN SHARE ROW EXCLUSIVE MODE;
CREATE SCHEMA IF NOT EXISTS pos_private;
CREATE TABLE pos_private.legacy_repair_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  original_row jsonb NOT NULL,
  repaired_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE pos_private.legacy_repair_audit FROM PUBLIC,anon,authenticated;

CREATE FUNCTION pg_temp.financial_fingerprint() RETURNS jsonb LANGUAGE sql AS $$
SELECT jsonb_build_object(
  'tickets',(SELECT md5(string_agg(jsonb_build_array(id,company_id,round(total_amount::numeric,2),status)::text,'|' ORDER BY id)) FROM public.tickets),
  'items',(SELECT md5(string_agg(jsonb_build_array(id,company_id,ticket_id,number,round(amount::numeric,2),schedule)::text,'|' ORDER BY id)) FROM public.ticket_items),
  'winners',(SELECT md5(string_agg(jsonb_build_array(id,company_id,ticket_id,result_id,round(prize_amount::numeric,2),is_paid,paid_at)::text,'|' ORDER BY id)) FROM public.winners),
  'cash_sessions',(SELECT md5(string_agg(jsonb_build_array(id,company_id,round(opening_amount::numeric,2),round(closing_amount::numeric,2),round(sales_total::numeric,2),round(prizes_total::numeric,2),status,opened_at,closed_at)::text,'|' ORDER BY id)) FROM public.cash_sessions),
  'movements',(SELECT md5(string_agg(jsonb_build_array(id,company_id,type,round(amount::numeric,2))::text,'|' ORDER BY id)) FROM public.cash_movements),
  'results',(SELECT md5(string_agg(jsonb_build_array(id,company_id,winning_number,draw_date,is_processed)::text,'|' ORDER BY id)) FROM public.results),
  'memberships',(SELECT md5(string_agg(jsonb_build_array(company_id,user_id,role,created_at)::text,'|' ORDER BY company_id,user_id)) FROM public.company_users)
);
$$;
CREATE TEMP TABLE legacy_financial_baseline AS SELECT pg_temp.financial_fingerprint() AS fingerprint;

CREATE TEMP TABLE legacy_game_map AS
SELECT DISTINCT old_id,company_id,gen_random_uuid()::text AS new_id FROM (
  SELECT i.game_id AS old_id,i.company_id FROM public.ticket_items i JOIN public.games g ON g.id=i.game_id WHERE i.company_id<>g.company_id
  UNION
  SELECT r.game_id,r.company_id FROM public.results r JOIN public.games g ON g.id=r.game_id WHERE r.company_id<>g.company_id
) targets;
CREATE TEMP TABLE legacy_schedule_map AS
SELECT s.id AS old_id,m.company_id,m.new_id AS new_game_id,gen_random_uuid()::text AS new_id
FROM public.draw_schedules s JOIN legacy_game_map m ON m.old_id=s.game_id;

INSERT INTO public.games(id,company_id,name,is_active,digit_count,multiplier,created_at,updated_at,deleted_at)
SELECT m.new_id,m.company_id,g.name,g.is_active,g.digit_count,g.multiplier,g.created_at,g.updated_at,g.deleted_at
FROM legacy_game_map m JOIN public.games g ON g.id=m.old_id;
INSERT INTO public.draw_schedules(id,game_id,name,time,is_active,created_at,updated_at,deleted_at)
SELECT m.new_id,m.new_game_id,s.name,s.time,s.is_active,s.created_at,s.updated_at,s.deleted_at
FROM legacy_schedule_map m JOIN public.draw_schedules s ON s.id=m.old_id;
INSERT INTO pos_private.legacy_repair_audit(entity,entity_id,action,original_row)
SELECT 'game_mapping',m.new_id,'copy_shared_configuration',to_jsonb(m) FROM legacy_game_map m;
INSERT INTO pos_private.legacy_repair_audit(entity,entity_id,action,original_row)
SELECT 'schedule_mapping',m.new_id,'copy_shared_configuration',to_jsonb(m) FROM legacy_schedule_map m;

INSERT INTO pos_private.legacy_repair_audit(entity,entity_id,action,original_row)
SELECT 'ticket_items',i.id,'use_company_game_copy',to_jsonb(i) FROM public.ticket_items i JOIN legacy_game_map m ON m.old_id=i.game_id AND m.company_id=i.company_id;
UPDATE public.ticket_items i SET game_id=m.new_id FROM legacy_game_map m WHERE m.old_id=i.game_id AND m.company_id=i.company_id;
INSERT INTO pos_private.legacy_repair_audit(entity,entity_id,action,original_row)
SELECT 'results',r.id,'use_company_game_copy',to_jsonb(r) FROM public.results r JOIN legacy_game_map m ON m.old_id=r.game_id AND m.company_id=r.company_id;
UPDATE public.results r SET game_id=m.new_id,schedule_id=s.new_id
FROM legacy_game_map m JOIN legacy_schedule_map s ON s.company_id=m.company_id AND s.new_game_id=m.new_id
WHERE m.old_id=r.game_id AND m.company_id=r.company_id AND s.old_id=r.schedule_id;

-- Keep the movement's declared company and amount. The foreign-company session
-- is not a valid association; its original value is retained for reconciliation.
INSERT INTO pos_private.legacy_repair_audit(entity,entity_id,action,original_row)
SELECT 'cash_movements',m.id,'foreign_session_pending_reconciliation',to_jsonb(m)
FROM public.cash_movements m JOIN public.cash_sessions s ON s.id=m.cash_session_id WHERE m.company_id<>s.company_id;
UPDATE public.cash_movements m SET cash_session_id=NULL FROM public.cash_sessions s WHERE s.id=m.cash_session_id AND m.company_id<>s.company_id;

CREATE TEMP TABLE legacy_duplicate_results AS
SELECT id FROM (
 SELECT r.id,row_number() OVER (
  PARTITION BY r.company_id,r.game_id,r.schedule_id,(r.draw_date AT TIME ZONE c.time_zone)::date
  ORDER BY EXISTS(SELECT 1 FROM public.winners w WHERE w.result_id=r.id) DESC,r.created_at,r.id
 ) AS position
 FROM public.results r JOIN public.companies c ON c.id=r.company_id WHERE r.deleted_at IS NULL
) ranked WHERE position>1;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM legacy_duplicate_results d JOIN public.winners w ON w.result_id=d.id) THEN
  RAISE EXCEPTION 'Duplicate results with financial records require manual reconciliation';
 END IF;
 IF EXISTS(
  SELECT 1 FROM public.results r JOIN public.companies c ON c.id=r.company_id WHERE r.deleted_at IS NULL
  GROUP BY r.company_id,r.game_id,r.schedule_id,(r.draw_date AT TIME ZONE c.time_zone)::date
  HAVING count(*)>1 AND (count(DISTINCT r.winning_number)>1 OR bool_or(r.is_processed<>1))
 ) THEN RAISE EXCEPTION 'Conflicting duplicate results require manual reconciliation'; END IF;
END $$;
INSERT INTO pos_private.legacy_repair_audit(entity,entity_id,action,original_row)
SELECT 'results',r.id,'archive_identical_processed_duplicate_without_winners',to_jsonb(r)
FROM public.results r JOIN legacy_duplicate_results d ON d.id=r.id;
UPDATE public.results r SET deleted_at=now() FROM legacy_duplicate_results d WHERE d.id=r.id;
