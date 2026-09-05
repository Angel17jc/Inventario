import { createClient } from '@supabase/supabase-js';

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
 * No schema type on purpose.
 *
 * This file used to carry a hand-written `Database` interface, and it had
 * described the January schema ever since: no `organization_id` on any table,
 * no `product_packs`, no `retired_at`, prices as strings when PostgREST sends
 * them as numbers. It was not merely out of date, it was misleading in both
 * directions — it accepted queries against columns that are gone and rejected
 * correct ones, which is why twenty-seven queries in storage.ts were written
 * `(supabase as any)` and three more carried a `@ts-expect-error` apologising
 * for "dynamic object conversion" that was really the type being wrong.
 *
 * A second hand-written description of the database drifts in silence; that is
 * the same lesson that got `database/schema.sql` deleted in August, and the
 * migrations are the one description of this database. So there is no copy
 * here. What the compiler cannot check, `storage-tenancy.test.ts` checks for
 * the one thing that matters — that every query is scoped to its shop — and
 * the API's Zod schemas check the shape of what goes out.
 *
 * To get real types back, generate them rather than write them:
 *
 *   npx supabase gen types typescript --project-id htkzkykfmnybkqcrtkby > backend/database.types.ts
 *
 * which needs a SUPABASE_ACCESS_TOKEN. Then import that file and pass it as
 * `createClient<Database>`, with a CI step that regenerates and diffs it so it
 * cannot go stale again. That step is the remaining half of M-13.
 */
export const supabase = createClient(supabaseUrl, supabaseKey);
