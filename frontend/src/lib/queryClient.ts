import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isSessionExpired } from "./api-errors";
import { supabase } from "./supabase";
import { toast } from "@/hooks/use-toast";

/**
 * A rejected token means the person has to sign in again, and every screen
 * would otherwise report it in its own words. Handling it once, where every
 * query and mutation passes through, keeps that out of the pages: signing out
 * lets the router return them to the sign-in screen on its own.
 */
let signingOut = false;

function handleExpiredSession(error: unknown) {
  if (!isSessionExpired(error) || signingOut) return;
  signingOut = true;
  toast({
    title: "Tu sesión caducó",
    description: "Vuelve a iniciar sesión para continuar. Lo que estabas escribiendo se conservó.",
    variant: "destructive",
  });
  void supabase.auth.signOut().finally(() => {
    signingOut = false;
  });
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleExpiredSession }),
  mutationCache: new MutationCache({ onError: handleExpiredSession }),
  defaultOptions: {
    queries: {
      // No default queryFn on purpose. Every query brings its own, which reads
      // the failure through throwApiError and so carries the server's code —
      // the thing isSessionExpired and describeError react to. The default
      // that used to sit here threw a bare Error instead, and a query written
      // without a queryFn would silently lose both the automatic sign-out and
      // the server's own wording. React Query now says so out loud instead.
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
