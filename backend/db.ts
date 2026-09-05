import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';

// Prefer using the Service Role Key on the server for full privileges.
// Fallback to ANON key only when SERVICE key is not provided (not recommended for production).
const rawSupabaseUrl = process.env.SUPABASE_URL || '';
// Normalize SUPABASE_URL: user might accidentally include the PostgREST path (/rest/v1)
let supabaseUrl = rawSupabaseUrl;
if (rawSupabaseUrl.includes('/rest/v1')) {
  // strip any trailing /rest/v1 or /rest/v1/
  supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/i, '');
  // eslint-disable-next-line no-console
  console.warn('Normalized SUPABASE_URL by removing /rest/v1 suffix. Using', supabaseUrl);
}
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) must be set. ' +
      'On the server prefer SUPABASE_SERVICE_ROLE_KEY from your Supabase project settings.',
  );
}

if (process.env.NODE_ENV === 'production' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set in production');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    'Warning: SUPABASE_SERVICE_ROLE_KEY not set; falling back to SUPABASE_ANON_KEY. ' +
      'This is OK for local dev but NOT recommended for production.',
  );
}

/**
 * The schema type is generated, never written.
 *
 * This file used to carry a hand-written `Database` interface describing the
 * January schema: no `organization_id` on any table, no `product_packs`, no
 * `retired_at`, prices as strings where PostgREST sends numbers. It rejected
 * correct code — which is why so many queries were written `(supabase as any)`
 * — and accepted queries against columns that were gone.
 *
 * `database.types.ts` comes from the database itself, via `npm run types:db`,
 * and CI regenerates it on every push and fails if it has drifted. That is the
 * difference that matters: a second description of the schema is only safe
 * when nobody is trusted to keep it up to date by hand.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
