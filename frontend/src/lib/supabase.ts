import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // The till is a shared machine: the session must not outlive the tab, so it
    // is held in sessionStorage rather than the default localStorage. Each tab
    // therefore signs in on its own, which is the intended trade-off.
    storage: window.sessionStorage,
  },
});
