import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateCategoryRequest, type UpdateCategoryRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { authenticatedFetch } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api-errors";

export function useCategories() {
  return useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await authenticatedFetch(api.categories.list.path);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return api.categories.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateCategoryRequest) => {
      const res = await authenticatedFetch(api.categories.create.path, {
        method: api.categories.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "No se pudo crear la categoría"));
      return api.categories.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      toast({ title: "Éxito", description: "Categoría creada correctamente" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateCategoryRequest) => {
      const url = buildUrl(api.categories.update.path, { id });
      const res = await authenticatedFetch(url, {
        method: api.categories.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "No se pudo actualizar la categoría"));
      return api.categories.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      toast({ title: "Éxito", description: "Categoría actualizada correctamente" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.categories.delete.path, { id });
      const res = await authenticatedFetch(url, { method: api.categories.delete.method });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "No se pudo eliminar la categoría"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      toast({ title: "Éxito", description: "Categoría eliminada correctamente" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
