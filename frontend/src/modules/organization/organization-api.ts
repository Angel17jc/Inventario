import { authenticatedFetch } from "@/lib/auth";
import { throwApiError } from "@/lib/api-errors";
import { LOGO_CONTENT_TYPES, LOGO_MAX_BYTES } from "@shared/schema";

export type ShopIdentity = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  logoUrl: string | null;
};

async function parseResponse(response: Response, fallbackMessage: string): Promise<ShopIdentity> {
  if (!response.ok) await throwApiError(response, fallbackMessage);
  return response.json() as Promise<ShopIdentity>;
}

export async function renameShop(name: string) {
  const response = await authenticatedFetch("/api/organization", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseResponse(response, "No se pudo guardar el nombre.");
}

export async function uploadShopLogo(file: File) {
  // Sent as raw bytes: base64 would inflate it by a third for no benefit.
  const response = await authenticatedFetch("/api/organization/logo", {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  return parseResponse(response, "No se pudo guardar el logo.");
}

export async function removeShopLogo() {
  const response = await authenticatedFetch("/api/organization/logo", { method: "DELETE" });
  return parseResponse(response, "No se pudo quitar el logo.");
}

/**
 * Checked here so the person hears about a file the server would reject
 * without waiting for the upload to travel and come back refused.
 */
export function describeUnusableLogo(file: File): string | null {
  if (!LOGO_CONTENT_TYPES.includes(file.type as (typeof LOGO_CONTENT_TYPES)[number])) {
    return "El logo debe ser una imagen PNG, JPG o WebP.";
  }
  if (file.size > LOGO_MAX_BYTES) {
    return `El logo pesa ${Math.round(file.size / 1024)} KB y el máximo son ${LOGO_MAX_BYTES / 1024} KB.`;
  }
  return null;
}
