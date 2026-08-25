import { MutationCache, QueryCache, QueryClient, QueryFunction } from "@tanstack/react-query";
import { authenticatedFetch } from "./auth";
import { isSessionExpired } from "./api-errors";
import { supabase } from "./supabase";
import { toast } from "@/hooks/use-toast";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await authenticatedFetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await authenticatedFetch(queryKey.join("/") as string);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

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
      queryFn: getQueryFn({ on401: "throw" }),
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
