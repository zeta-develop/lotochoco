-- Run against a disposable database after bootstrap.sql and supabase_schema.sql.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean,message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'ASSERT: %',message; END IF; END $$;
CREATE FUNCTION pg_temp.fail_movement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF current_setting('test.fail_movement',true)='on' THEN RAISE EXCEPTION 'Injected accounting failure'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER test_fail_movement BEFORE INSERT ON public.cash_movements FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_movement();
INSERT INTO auth.users(id) VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
INSERT INTO public.companies(id,name) VALUES ('10000000-0000-0000-0000-000000000001','A'),('10000000-0000-0000-0000-000000000002','B');
INSERT INTO public.company_users(company_id,user_id,role) VALUES ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','owner'),('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','owner'),('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','user');
UPDATE public.companies SET time_zone=(SELECT name FROM pg_timezone_names WHERE name LIKE 'Etc/GMT%' AND extract(hour FROM now() AT TIME ZONE name)=0 LIMIT 1);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.companies),'tenant visibility');
DO $$ BEGIN
  BEGIN INSERT INTO public.company_users(company_id,user_id,role) VALUES('10000000-0000-0000-0000-000000000002',auth.uid(),'owner'); RAISE EXCEPTION 'self membership unexpectedly allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.company_users SET role='owner' WHERE user_id=auth.uid(); RAISE EXCEPTION 'self role update unexpectedly allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.pos_open_cash('10000000-0000-0000-0000-000000000002',100); RAISE EXCEPTION 'foreign cash unexpectedly allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
INSERT INTO public.games(id,company_id,name,digit_count,multiplier) VALUES('g','10000000-0000-0000-0000-000000000001','Game',2,70);
INSERT INTO public.draw_schedules(id,company_id,game_id,name,time) VALUES('s','10000000-0000-0000-0000-000000000001','g','Morning','11:00');
SELECT public.pos_open_cash('10000000-0000-0000-0000-000000000001',100) AS cash_id \gset
INSERT INTO public.draw_schedules(id,company_id,game_id,name,time) VALUES('closed-schedule','10000000-0000-0000-0000-000000000001','g','Closed','00:00');
DO $$ BEGIN
  BEGIN PERFORM public.pos_create_sale('10000000-0000-0000-0000-000000000001','closed-sale',null,'[{"gameId":"g","number":"12","amount":20,"schedule":"00:00"}]'); RAISE EXCEPTION 'closed draw accepted sale'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'La venta para este sorteo ya está cerrada' THEN RAISE; END IF; END;
END $$;
SELECT public.pos_create_sale('10000000-0000-0000-0000-000000000001','sale-1',null,'[{"gameId":"g","number":"12","amount":20,"schedule":"11:00"}]') AS ticket_id \gset
SELECT pg_temp.assert_true((public.pos_cash_summary('10000000-0000-0000-0000-000000000001')->>'balance')::numeric=120,'sale counted');
SELECT pg_temp.assert_true(public.pos_create_sale('10000000-0000-0000-0000-000000000001','sale-1',null,'[{"gameId":"g","number":"12","amount":20,"schedule":"11:00"}]')=:'ticket_id','sale retry returns same ticket');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.tickets),'sale retry did not duplicate');
DO $$ BEGIN
  BEGIN PERFORM public.pos_create_sale('10000000-0000-0000-0000-000000000001','sale-1',null,'[{"gameId":"g","number":"13","amount":20,"schedule":"11:00"}]'); RAISE EXCEPTION 'changed retry accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='changed retry accepted' THEN RAISE; END IF; END;
  BEGIN PERFORM public.pos_create_sale('10000000-0000-0000-0000-000000000001','bad',null,'[{"gameId":"g","number":"12","amount":20,"schedule":"11:00"},{"gameId":"foreign","number":"12","amount":10,"schedule":"11:00"}]'); RAISE EXCEPTION 'partial sale accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='partial sale accepted' THEN RAISE; END IF; END;
END $$;
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.tickets),'failed sale rolled back all writes');
SET LOCAL test.fail_movement='on';
DO $$ BEGIN
  BEGIN PERFORM public.pos_create_sale('10000000-0000-0000-0000-000000000001','fail-accounting',null,'[{"gameId":"g","number":"12","amount":20,"schedule":"11:00"}]'); RAISE EXCEPTION 'accounting failure ignored'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Injected accounting failure' THEN RAISE; END IF; END;
END $$;
SET LOCAL test.fail_movement='off';
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.tickets),'accounting failure rolled back ticket');
SELECT pg_temp.assert_true((public.pos_cash_summary('10000000-0000-0000-0000-000000000001')->>'balance')::numeric=120,'accounting failure rolled back cash');
SELECT public.pos_cancel_ticket('10000000-0000-0000-0000-000000000001',:'ticket_id','Test refund');
SELECT public.pos_cancel_ticket('10000000-0000-0000-0000-000000000001',:'ticket_id','Test refund retry');
SELECT pg_temp.assert_true((public.pos_cash_summary('10000000-0000-0000-0000-000000000001')->>'balance')::numeric=100,'refund applied exactly once');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.cancellation_logs),'one cancellation log');
SELECT pg_temp.assert_true(jsonb_array_length(public.pos_game_stats('10000000-0000-0000-0000-000000000001'))=0,'cancelled sale excluded from game stats');
SELECT public.pos_create_sale('10000000-0000-0000-0000-000000000001','winner-sale',null,'[{"gameId":"g","number":"12","amount":10,"schedule":"11:00"}]') AS winner_ticket \gset
UPDATE public.games SET multiplier=100 WHERE id='g';
INSERT INTO public.results(id,company_id,game_id,schedule_id,winning_number,draw_date) VALUES('r','10000000-0000-0000-0000-000000000001','g','s','12',now());
SELECT pg_temp.assert_true(public.pos_process_result('10000000-0000-0000-0000-000000000001','r')=1,'found winner');
SELECT pg_temp.assert_true(public.pos_process_result('10000000-0000-0000-0000-000000000001','r')=1,'process retry has same count');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.winners),'process retry no duplicate');
DO $$ BEGIN
  BEGIN INSERT INTO public.results(id,company_id,game_id,schedule_id,winning_number,draw_date) VALUES('duplicate','10000000-0000-0000-0000-000000000001','g','s','12',now()); RAISE EXCEPTION 'duplicate draw accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE public.results SET deleted_at=now() WHERE id='r'; RAISE EXCEPTION 'processed draw hidden'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='processed draw hidden' THEN RAISE; END IF; END;
  BEGIN PERFORM public.pos_create_sale('10000000-0000-0000-0000-000000000001','late-sale',null,'[{"gameId":"g","number":"12","amount":10,"schedule":"11:00"}]'); RAISE EXCEPTION 'late sale accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='late sale accepted' THEN RAISE; END IF; END;
END $$;
SELECT pg_temp.assert_true((SELECT prize_amount=700 FROM public.winners),'prize uses multiplier at sale');
SELECT id AS winner_id FROM public.winners \gset
SELECT public.pos_pay_winner('10000000-0000-0000-0000-000000000001',:'winner_id');
SELECT public.pos_pay_winner('10000000-0000-0000-0000-000000000001',:'winner_id');
SELECT pg_temp.assert_true((public.pos_cash_summary('10000000-0000-0000-0000-000000000001')->>'balance')::numeric=-590,'prize deducts 700 once from 110');
DO $$ DECLARE t text; BEGIN
  SELECT ticket_id INTO t FROM public.winners LIMIT 1;
  BEGIN PERFORM public.pos_cancel_ticket('10000000-0000-0000-0000-000000000001',t,'Cannot cancel winner'); RAISE EXCEPTION 'winner cancellation accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='winner cancellation accepted' THEN RAISE; END IF; END;
  BEGIN DELETE FROM public.cancellation_logs; RAISE EXCEPTION 'audit deletion accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.cash_sessions SET sales_total=999999; RAISE EXCEPTION 'direct cash manipulation accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT public.pos_add_cash_movement('10000000-0000-0000-0000-000000000001',:'cash_id','income',50,'Deposit');
SELECT public.pos_add_cash_movement('10000000-0000-0000-0000-000000000001',:'cash_id','expense',5,'Expense');
SELECT pg_temp.assert_true((public.pos_cash_summary('10000000-0000-0000-0000-000000000001')->>'balance')::numeric=-545,'manual movements included');
-- Server aggregation/processing must not truncate at the usual REST page size.
INSERT INTO public.games(id,company_id,name,digit_count,multiplier) VALUES('bulk-game','10000000-0000-0000-0000-000000000001','Bulk',2,70);
INSERT INTO public.draw_schedules(id,company_id,game_id,name,time) VALUES('bulk-schedule','10000000-0000-0000-0000-000000000001','bulk-game','Bulk','12:00');
SELECT public.pos_create_sale('10000000-0000-0000-0000-000000000001','bulk-1',null,(SELECT jsonb_agg(jsonb_build_object('gameId','bulk-game','number','34','amount',1,'schedule','12:00')) FROM generate_series(1,1000)));
SELECT public.pos_create_sale('10000000-0000-0000-0000-000000000001','bulk-2',null,'[{"gameId":"bulk-game","number":"34","amount":1,"schedule":"12:00"}]');
INSERT INTO public.results(id,company_id,game_id,schedule_id,winning_number,draw_date) VALUES('bulk-result','10000000-0000-0000-0000-000000000001','bulk-game','bulk-schedule','34',now());
SELECT pg_temp.assert_true(public.pos_process_result('10000000-0000-0000-0000-000000000001','bulk-result')=1001,'processing includes more than 1000 jugadas');
SELECT pg_temp.assert_true((public.pos_sales_report('10000000-0000-0000-0000-000000000001')->>'totalSales')::numeric=1011,'report includes all sales');
SET LOCAL request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
DO $$ BEGIN
  UPDATE public.companies SET name='Unauthorized';
  IF FOUND THEN RAISE EXCEPTION 'member changed company'; END IF;
  BEGIN PERFORM public.pos_set_member_role('10000000-0000-0000-0000-000000000001',auth.uid(),'admin'); RAISE EXCEPTION 'member escalated'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.pos_process_result('10000000-0000-0000-0000-000000000001','r'); RAISE EXCEPTION 'member processed result'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT pg_temp.assert_true((SELECT name='A' FROM public.companies),'ordinary member cannot edit company');
RESET ROLE;
ROLLBACK;
