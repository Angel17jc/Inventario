import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured");
}

// Read while the module loads, which is before the router mounts. Recovery
// links carry their tokens in the URL fragment, and both wouter's history
// navigation and supabase-js itself erase it: the first drops the fragment when
// it replaces the path, the second clears it once the tokens are consumed. By
// the time a component renders, the evidence can already be gone.
function cameFromRecoveryLink() {
  const { hash, search } = window.location;
  return hash.includes("type=recovery") || search.includes("type=recovery") || search.includes("reset=1");
}

export const arrivedFromRecoveryLink = cameFromRecoveryLink();

// A recovery link is single use, and any GET consumes it: mail providers and
// security scanners that prefetch links in messages burn the token before the
// recipient clicks. Supabase then redirects with the failure in the fragment
// instead of the tokens, and without reading it the app would show a form that
// cannot possibly work.
function readRecoveryLinkError() {
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const code = fragment.get("error_code") ?? query.get("error_code");
  const reason = fragment.get("error") ?? query.get("error");
  if (!code && !reason) return null;
  return code === "otp_expired" ? "expired" : "invalid";
}

export const recoveryLinkError = readRecoveryLinkError();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // The till is a shared machine: the session must not outlive the tab, so it
    // is held in sessionStorage rather than the default localStorage. Each tab
    // therefore signs in on its own, which is the intended trade-off.
    storage: window.sessionStorage,
  },
});
