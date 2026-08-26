import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type CreateMovementRequest } from "@shared/routes";
import type { LedgerEntry } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { describeError, throwApiError } from "@/lib/api-errors";
import { authenticatedFetch } from "@/lib/auth";

export function useMovements() {
  return useQuery({ queryKey: [api.movements.list.path], queryFn: async () => {
    const response = await authenticatedFetch(api.movements.list.path);
    if (!response.ok) await throwApiError(response, "No se pudieron cargar los movimientos");
    return api.movements.list.responses[200].parse(await response.json());
  }});
}

/** Stock and money on one line of time. Also invalidated by credit payments. */
export const ledgerKey = ["/api/movimientos/historial"] as const;

export function useLedger() {
  return useQuery({ queryKey: ledgerKey, queryFn: async () => {
    const response = await authenticatedFetch(ledgerKey[0]);
    if (!response.ok) await throwApiError(response, "No se pudo cargar el historial");
    return (await response.json()) as LedgerEntry[];
  }});
}

export function useCreateMovement() {
  const queryClient = useQueryClient(); const { toast } = useToast();
  return useMutation({ mutationFn: async (data: CreateMovementRequest) => {
    const response = await authenticatedFetch(api.movements.create.path, { method: api.movements.create.method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!response.ok) await throwApiError(response, "No se pudo registrar el movimiento");
    return api.movements.create.responses[201].parse(await response.json());
  }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: [api.movements.list.path] }); queryClient.invalidateQueries({ queryKey: ledgerKey }); queryClient.invalidateQueries({ queryKey: [api.products.list.path] }); queryClient.invalidateQueries({ queryKey: [api.stats.get.path] }); toast({ title: "Éxito", description: "Movimiento registrado correctamente" }); }, onError: (error) => toast({ title: "No se pudo guardar", description: describeError(error, "No se pudo registrar el movimiento."), variant: "destructive" }) });
}

export function useStats() {
  return useQuery({ queryKey: [api.stats.get.path], queryFn: async () => {
    const response = await authenticatedFetch(api.stats.get.path);
    if (!response.ok) await throwApiError(response, "No se pudieron cargar las estadísticas");
    return api.stats.get.responses[200].parse(await response.json());
  }});
}
