import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { CreditAccountWithDetails, CreditsStats, CreateCreditAccountRequest, CreateCreditPaymentRequest } from "@shared/schema";
import { authenticatedFetch } from "@/lib/auth";
import { ledgerKey } from "@/modules/inventory/movements/movement-queries";
import { throwApiError } from "@/lib/api-errors";

async function fetchCredits(): Promise<CreditAccountWithDetails[]> {
  const response = await authenticatedFetch("/api/credits");
  if (!response.ok) await throwApiError(response, "No se pudieron cargar los fiados.");
  return response.json();
}

async function fetchCreditsByCustomer(customerName: string): Promise<CreditAccountWithDetails[]> {
  const response = await authenticatedFetch(`/api/credits/customer/${encodeURIComponent(customerName)}`);
  if (!response.ok) await throwApiError(response, "No se pudieron cargar los fiados del cliente.");
  return response.json();
}

async function fetchCreditsStats(): Promise<CreditsStats> {
  const response = await authenticatedFetch("/api/credits/stats");
  if (!response.ok) await throwApiError(response, "No se pudieron cargar las estadísticas de fiados.");
  return response.json();
}

async function createCredit(credit: CreateCreditAccountRequest) {
  const response = await authenticatedFetch("/api/credits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credit),
  });
  if (!response.ok) await throwApiError(response, "No se pudo registrar el fiado.");
  return response.json();
}

async function createPayment(payment: CreateCreditPaymentRequest) {
  const response = await authenticatedFetch("/api/credits/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payment),
  });
  if (!response.ok) await throwApiError(response, "No se pudo registrar el pago.");
  return response.json();
}

export function useCredits() {
  return useQuery<CreditAccountWithDetails[]>({
    queryKey: ["credits"],
    queryFn: fetchCredits,
  });
}

export function useCreditsByCustomer(customerName: string) {
  return useQuery<CreditAccountWithDetails[]>({
    queryKey: ["credits", "customer", customerName],
    queryFn: () => fetchCreditsByCustomer(customerName),
    enabled: !!customerName,
  });
}

export function useCreditsStats() {
  return useQuery<CreditsStats>({
    queryKey: ["credits", "stats"],
    queryFn: fetchCreditsStats,
  });
}

export function useCreateCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCredit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      // A fiado leaves the shelf like any other sale: create_credit_sale
      // subtracts the stock, so whatever counts it has to be read again. The
      // key is the request path, which is what useProducts and useStats
      // register under — a loose "products" matches no query and fails in
      // silence, leaving the old figure on screen until a reload.
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: ledgerKey });
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      // The payment belongs to the shop's day as much as a sale does.
      queryClient.invalidateQueries({ queryKey: ledgerKey });
    },
  });
}
