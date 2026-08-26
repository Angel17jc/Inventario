import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Presentation } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { authenticatedFetch } from "@/lib/auth";
import { describeError, throwApiError } from "@/lib/api-errors";

const keyFor = (productId: number) => ["/api/products", productId, "presentaciones"] as const;

/**
 * The ways one product leaves the counter: loose, by the case of 6, by the
 * case of 12. Loaded per product because the movement form only ever needs the
 * presentations of the product being registered.
 */
export function usePresentations(productId: number | undefined) {
  return useQuery({
    queryKey: keyFor(productId ?? 0),
    enabled: Boolean(productId),
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/products/${productId}/presentaciones`);
      if (!response.ok) await throwApiError(response, "No se pudieron cargar las presentaciones.");
      return (await response.json()) as Presentation[];
    },
  });
}

export function useCreatePresentation(productId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { label: string; units: number; cost: number | null; price: number | null }) => {
      const response = await authenticatedFetch(`/api/products/${productId}/presentaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) await throwApiError(response, "No se pudo crear la presentación.");
      return (await response.json()) as Presentation;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keyFor(productId) });
      toast({ title: "Presentación agregada" });
    },
    onError: (error) => toast({
      title: "No se pudo agregar",
      description: describeError(error, "Vuelve a intentarlo en unos momentos."),
      variant: "destructive",
    }),
  });
}

export function useDeletePresentation(productId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (packId: number) => {
      const response = await authenticatedFetch(`/api/presentaciones/${packId}`, { method: "DELETE" });
      if (!response.ok) await throwApiError(response, "No se pudo quitar la presentación.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keyFor(productId) });
      toast({ title: "Presentación eliminada" });
    },
    onError: (error) => toast({
      title: "No se pudo quitar",
      description: describeError(error, "Vuelve a intentarlo en unos momentos."),
      variant: "destructive",
    }),
  });
}
