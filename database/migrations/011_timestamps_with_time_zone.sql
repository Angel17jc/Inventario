-- Fixes the hour shown against every movement, credit and payment.
--
-- These columns were declared TIMESTAMP, which stores a wall-clock reading and
-- forgets which clock it came from. Supabase runs Postgres in UTC, so a sale at
-- 14:53 in Ecuador was stored as 19:53 and sent to the browser as
-- "2026-08-20T19:53:47" with nothing to say it was UTC. JavaScript reads a
-- string in that form as local time, so the interface displayed 19:53: five
-- hours ahead of when it actually happened.
--
-- TIMESTAMPTZ keeps the instant rather than the reading. The same sale then
-- travels as "...T19:53:47+00:00" and every browser renders it in its own zone
-- without the application converting anything by hand — which also means a
-- shop in a different zone gets its own local time for free.
--
-- The existing values are UTC readings, so they are reinterpreted as UTC. Doing
-- it any other way would move history by five hours.

ALTER TABLE movements
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE credit_accounts
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE credit_payments
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- NOW() already returns an instant; the defaults simply stop being truncated.
ALTER TABLE movements       ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE credit_accounts ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE credit_accounts ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE credit_payments ALTER COLUMN created_at SET DEFAULT NOW();
