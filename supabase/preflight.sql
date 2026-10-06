-- Read-only checks against the legacy schema. Review every returned row.
SELECT company_id,user_id,role FROM public.company_users WHERE role IS NULL OR lower(role) NOT IN ('owner','admin','manager','user');
SELECT company_id,ticket_number,count(*) FROM public.tickets GROUP BY company_id,ticket_number HAVING count(*)>1;
SELECT company_id,count(*) FROM public.cash_sessions WHERE status='open' GROUP BY company_id HAVING count(*)>1;
SELECT id,company_id,total_amount FROM public.tickets WHERE company_id IS NULL OR total_amount IS NULL OR total_amount<=0 OR total_amount::text IN ('NaN','Infinity','-Infinity');
SELECT id,company_id,amount FROM public.ticket_items WHERE company_id IS NULL OR amount IS NULL OR amount<=0 OR amount::text IN ('NaN','Infinity','-Infinity');
SELECT id,company_id,prize_amount FROM public.winners WHERE company_id IS NULL OR prize_amount IS NULL OR prize_amount<=0 OR prize_amount::text IN ('NaN','Infinity','-Infinity');
SELECT id,company_id,multiplier FROM public.games WHERE company_id IS NULL OR multiplier IS NULL OR multiplier<=0 OR multiplier::text IN ('NaN','Infinity','-Infinity');
SELECT id,company_id FROM public.cash_sessions WHERE company_id IS NULL OR opening_amount IS NULL OR sales_total IS NULL OR prizes_total IS NULL;
SELECT id,company_id FROM public.cash_movements WHERE company_id IS NULL OR amount IS NULL;
SELECT id,company_id FROM public.results WHERE company_id IS NULL OR draw_date IS NULL;
SELECT id,company_id FROM public.settings WHERE company_id IS NULL;
SELECT id,company_id FROM public.cancellation_logs WHERE company_id IS NULL;
SELECT id,company_id FROM public.app_error_logs WHERE company_id IS NULL;
SELECT 'item_ticket' relation,i.id FROM public.ticket_items i JOIN public.tickets t ON t.id=i.ticket_id WHERE i.company_id IS DISTINCT FROM t.company_id
UNION ALL SELECT 'item_game',i.id FROM public.ticket_items i JOIN public.games g ON g.id=i.game_id WHERE i.company_id IS DISTINCT FROM g.company_id
UNION ALL SELECT 'winner_ticket',w.id FROM public.winners w JOIN public.tickets t ON t.id=w.ticket_id WHERE w.company_id IS DISTINCT FROM t.company_id
UNION ALL SELECT 'winner_result',w.id FROM public.winners w JOIN public.results r ON r.id=w.result_id WHERE w.company_id IS DISTINCT FROM r.company_id
UNION ALL SELECT 'movement_session',m.id FROM public.cash_movements m JOIN public.cash_sessions s ON s.id=m.cash_session_id WHERE m.company_id IS DISTINCT FROM s.company_id
UNION ALL SELECT 'result_game',r.id FROM public.results r JOIN public.games g ON g.id=r.game_id WHERE r.company_id IS DISTINCT FROM g.company_id
UNION ALL SELECT 'result_schedule',r.id FROM public.results r JOIN public.draw_schedules s ON s.id=r.schedule_id JOIN public.games g ON g.id=s.game_id WHERE r.company_id IS DISTINCT FROM g.company_id OR r.game_id IS DISTINCT FROM s.game_id;
-- Before preparing time_zone, this detects duplicate draws in UTC. Repeat using
-- each company's configured zone once the optional preparation in the docs is done.
SELECT company_id,game_id,schedule_id,(draw_date AT TIME ZONE 'UTC')::date draw_day,count(*) FROM public.results GROUP BY 1,2,3,4 HAVING count(*)>1;
SELECT ticket_id,result_id,count(*) FROM public.winners GROUP BY 1,2 HAVING count(*)>1;
-- Multiple winners per ticket may be legitimate distinct jugadas: reconcile them,
-- do not blindly deduplicate this last query.
