import { authenticatedFetch } from "@/lib/auth";
import { throwApiError } from "@/lib/api-errors";

type CreateOrganizationInput = {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
};

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) await throwApiError(response, fallbackMessage);
  return response.json() as Promise<T>;
}

export async function createOrganization(input: CreateOrganizationInput) {
  const response = await authenticatedFetch("/api/platform/organizations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<{ organization: { id: string; name: string } }>(response, "No fue posible crear el cliente.");
}


export type PlatformClient = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  ownerEmail: string | null;
};

export async function listClients() {
  const response = await authenticatedFetch("/api/platform/organizations");
  return parseResponse<PlatformClient[]>(response, "No se pudo cargar la lista de clientes.");
}

export async function setClientStatus(organizationId: string, status: PlatformClient["status"]) {
  const response = await authenticatedFetch(`/api/platform/organizations/${organizationId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return parseResponse<PlatformClient>(response, "No se pudo cambiar el estado del cliente.");
}

export async function createOwnShop(input: { name: string; slug: string }) {
  const response = await authenticatedFetch("/api/platform/organizations/mine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<{ organization: { id: string; name: string } }>(response, "No fue posible crear tu licorería.");
}
