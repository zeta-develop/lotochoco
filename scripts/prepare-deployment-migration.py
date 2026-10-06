"""Set the confirmed business time zone within the migration transaction."""
from pathlib import Path
import sys

source = Path('supabase/migrations/202610060001_secure_pos.sql').read_text()
if source.count('\nBEGIN;\n') != 1:
    raise SystemExit('Expected exactly one migration transaction')
preparation = """BEGIN;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'UTC';
UPDATE public.companies SET time_zone = :'verified_zone';
"""
validation = "SELECT name AS verified_zone FROM pg_timezone_names WHERE name = :'company_time_zone' \\gset\n"
if '--legacy-compatibility' in sys.argv[2:]:
    preparation += Path('supabase/legacy-compatibility.sql').read_text() + '\n'
    conservation = """DO $$ BEGIN
 IF (SELECT fingerprint FROM legacy_financial_baseline) IS DISTINCT FROM pg_temp.financial_fingerprint() THEN
  RAISE EXCEPTION 'Financial conservation check failed; migration rolled back';
 END IF;
END $$;
COMMIT;"""
    if source.count('\nCOMMIT;') != 1:
        raise SystemExit('Expected exactly one migration commit')
    source = source.replace('\nCOMMIT;', '\n' + conservation, 1)
Path(sys.argv[1]).write_text(validation + source.replace('BEGIN;\n', preparation, 1))
