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

