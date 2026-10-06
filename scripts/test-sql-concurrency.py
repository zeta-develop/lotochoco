#!/usr/bin/env python3
"""Real PostgreSQL regression checks. DATABASE_URL must name a disposable test DB.
Initialize it with tests/sql/bootstrap.sql and supabase_schema.sql first.
"""
import concurrent.futures
import json
import os
import subprocess
import uuid
from pathlib import Path

url = os.environ.get('DATABASE_URL')
if not url:
    raise SystemExit('Set DATABASE_URL to a disposable local PostgreSQL database')

def sql(statement):
    result = subprocess.run(['psql', url, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', statement], text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()

def lit(value):
    return "'" + value.replace("'", "''") + "'"

company, user = str(uuid.uuid4()), str(uuid.uuid4())
game, schedule, result_id = [str(uuid.uuid4()) for _ in range(3)]
identity = f"SET ROLE authenticated; SET request.jwt.claim.sub={lit(user)}; "
def as_user(statement):
    return sql(identity + statement)

try:
    sql(f"INSERT INTO auth.users(id) VALUES ({lit(user)}); INSERT INTO public.companies(id,name,time_zone) VALUES ({lit(company)},'Concurrency regression',(SELECT name FROM pg_timezone_names WHERE name LIKE 'Etc/GMT%' AND extract(hour FROM now() AT TIME ZONE name)=0 LIMIT 1)); INSERT INTO public.company_users(company_id,user_id,role) VALUES ({lit(company)},{lit(user)},'owner'); INSERT INTO public.games(id,company_id,name,digit_count,multiplier) VALUES ({lit(game)},{lit(company)},'Test',2,70); INSERT INTO public.draw_schedules(id,company_id,game_id,name,time) VALUES ({lit(schedule)},{lit(company)},{lit(game)},'Test','11:00');")
    cash = as_user(f"SELECT public.pos_open_cash({lit(company)},100)")
    def sell(index):
        payload=json.dumps([{'gameId':game,'number':'12','amount':index+1,'schedule':'11:00'}])
        return as_user(f"SELECT public.pos_create_sale({lit(company)},'request-{index}',null,{lit(payload)}::jsonb)")
    # Distinct sales are interleaved with retries of the exact same requests.
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        tickets = list(pool.map(sell, list(range(12)) * 2))
    assert len(set(tickets)) == 12, 'Concurrent retries duplicated tickets'
    assert sql(f"SELECT count(DISTINCT ticket_number) FROM public.tickets WHERE company_id={lit(company)}") == '12', 'Duplicate folios'
    summary=json.loads(as_user(f"SELECT public.pos_cash_summary({lit(company)})"))
    assert summary['balance'] == 178 and summary['salesTotal'] == 78, summary
    # The same refund concurrently must reverse only one sale.
    refund=f"SELECT public.pos_cancel_ticket({lit(company)},{lit(tickets[0])},'Concurrent refund')"
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda _: as_user(refund), range(4)))
    summary=json.loads(as_user(f"SELECT public.pos_cash_summary({lit(company)})"))
    assert summary['balance'] == 177, summary
    as_user(f"INSERT INTO public.results(id,company_id,game_id,schedule_id,winning_number,draw_date) VALUES ({lit(result_id)},{lit(company)},{lit(game)},{lit(schedule)},'12',now())")
    process=f"SELECT public.pos_process_result({lit(company)},{lit(result_id)})"
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        counts=list(pool.map(lambda _: as_user(process),range(4)))
    assert counts == ['11']*4, counts
    assert sql(f"SELECT count(*) FROM public.winners WHERE company_id={lit(company)}") == '11'
    winner=sql(f"SELECT id FROM public.winners WHERE company_id={lit(company)} ORDER BY prize_amount LIMIT 1")
    payment=f"SELECT public.pos_pay_winner({lit(company)},{lit(winner)})"
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda _: as_user(payment), range(4)))
    summary=json.loads(as_user(f"SELECT public.pos_cash_summary({lit(company)})"))
    assert summary['prizesTotal'] == 140 and summary['balance'] == 37, summary
    assert sql(f"SELECT count(*) FROM public.cash_movements WHERE reference_id={lit(winner)} AND type='prize_payment'") == '1'
    print('PASS: concurrent sales/retries, unique folios, refund, processing and payment')
finally:
    # Delete only fixtures from this run; historical business data is never touched.
    sql(f"DELETE FROM public.companies WHERE id={lit(company)}; DELETE FROM auth.users WHERE id={lit(user)}")
