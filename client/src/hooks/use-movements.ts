import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateMovementRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useMovements() {
  return useQuery({
    queryKey: [api.movements.list.path],
    queryFn: async () => {
      const res = await fetch(api.movements.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch movements");
      return api.movements.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMovement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateMovementRequest) => {
      const res = await fetch(api.movements.create.path, {
        method: api.movements.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to register movement");
      }
      return api.movements.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.movements.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      toast({ title: "Éxito", description: "Movimiento registrado correctamente" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useStats() {
  return useQuery({
    queryKey: [api.stats.get.path],
    queryFn: async () => {
      const res = await fetch(api.stats.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.stats.get.responses[200].parse(await res.json());
    },
  });
}
