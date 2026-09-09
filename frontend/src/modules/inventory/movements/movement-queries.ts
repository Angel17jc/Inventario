import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type CreateMovementRequest } from "@shared/routes";
import type { CreateSaleRequest, LedgerEntry, SaleResult } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { describeError, throwApiError } from "@/lib/api-errors";
import { authenticatedFetch } from "@/lib/auth";

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
  }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ledgerKey }); queryClient.invalidateQueries({ queryKey: [api.products.list.path] }); queryClient.invalidateQueries({ queryKey: [api.stats.get.path] }); toast({ title: "Éxito", description: "Movimiento registrado correctamente" }); }, onError: (error) => toast({ title: "No se pudo guardar", description: describeError(error, "No se pudo registrar el movimiento."), variant: "destructive" }) });
}

/**
 * A whole sale: several products handed over at once. The lines go in one
 * request because they are one transaction — the database refuses the lot if
 * any line is wrong rather than leaving half a sale registered.
 */
export function useCreateSale() {
  const queryClient = useQueryClient(); const { toast } = useToast();
  return useMutation({ mutationFn: async (sale: CreateSaleRequest) => {
    const response = await authenticatedFetch("/api/ventas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sale) });
    if (!response.ok) await throwApiError(response, "No se pudo registrar la venta");
    return (await response.json()) as SaleResult;
  }, onSuccess: (resultado) => {
    queryClient.invalidateQueries({ queryKey: ledgerKey });
    queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    toast({ title: "Venta registrada", description: `Total ${resultado.total.toFixed(2)}` });
  }, onError: (error) => toast({ title: "No se pudo guardar", description: describeError(error, "No se pudo registrar la venta."), variant: "destructive" }) });
}

export function useStats() {
  return useQuery({ queryKey: [api.stats.get.path], queryFn: async () => {
    const response = await authenticatedFetch(api.stats.get.path);
    if (!response.ok) await throwApiError(response, "No se pudieron cargar las estadísticas");
    return api.stats.get.responses[200].parse(await response.json());
  }});
}
