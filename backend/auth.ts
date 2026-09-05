import type { NextFunction, Request, Response } from "express";
import { supabase } from "./db.js";
import { fail } from "./errors.js";
import { platformService } from "./platform-service.js";
import { errorCodes } from "../shared/errors.js";
import type { OrganizationRole } from "../shared/tenancy.js";
export { requireOrganizationRole } from "./authorization.js";

const organizationRoles = ["owner", "manager", "cashier"] as const;
const DEFAULT_ADMINISTRATOR_SHOP_NAME = "Mi Licorería";

/** The browser speaks camelCase; the column is logo_url. */
function toOrganizationSummary(organization: any, role: string) {
  const { logo_url: logoUrl, ...rest } = organization ?? {};
  return { ...rest, logoUrl: logoUrl ?? null, role };
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AuthenticatedUser {
  id: string;
  email: string | undefined;
  isPlatformAdmin: boolean;
}

export interface OrganizationContext {
  id: string;
  role: OrganizationRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      organization?: OrganizationContext;
    }
  }
}

function getBearerToken(request: Request): string | undefined {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) return undefined;
  return authorization.slice("Bearer ".length).trim() || undefined;
}

function isOrganizationRole(role: unknown): role is OrganizationRole {
  return typeof role === "string" && organizationRoles.includes(role as OrganizationRole);
}

export async function requireAuthenticatedUser(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) return fail(res, 401, errorCodes.unauthenticated, "Inicia sesión para continuar.");

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return fail(res, 401, errorCodes.sessionExpired, "Tu sesión caducó. Vuelve a iniciar sesión.");

  // `role: admin` is accepted only during the migration from the legacy release.
  const isPlatformAdmin = user.app_metadata.platform_role === "platform_admin" || user.app_metadata.role === "admin";
  req.user = { id: user.id, email: user.email, isPlatformAdmin };
  return next();
}

export async function requireOrganizationContext(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return fail(res, 401, errorCodes.unauthenticated, "Inicia sesión para continuar.");

  const organizationId = req.header("x-organization-id");
  if (!organizationId || !uuidPattern.test(organizationId)) {
    return fail(res, 400, errorCodes.organizationRequired, "No hay una empresa seleccionada. Vuelve a entrar y elige una.");
  }

  // The organization's own status is read alongside the membership: suspending
  // a tenant has to cut off its API access, and filtering by status in the
  // browser only hides the data from the interface.
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("role, organization:organizations(status)")
    .eq("organization_id", organizationId)
    .eq("user_id", req.user.id)
    .eq("status", "active")
    .maybeSingle();
  if (error) return next(error);
  // A membership belongs to one organization, so PostgREST embeds it as an
  // object. With no schema type the client cannot know the cardinality and
  // guesses an array; checked against the database, the row arrives as
  // { role, organization: { status } }.
  const membership = data as { role: string; organization: { status: string } | null } | null;
  if (!membership || !isOrganizationRole(membership.role)) return fail(res, 403, errorCodes.forbidden, "No tienes acceso a esta empresa.");
  if (membership.organization?.status !== "active") {
    return fail(res, 403, errorCodes.organizationSuspended, "Esta empresa está suspendida. Contacta al administrador.");
  }

  req.organization = { id: organizationId, role: membership.role };
  return next();
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isPlatformAdmin) return fail(res, 403, errorCodes.forbidden, "Necesitas permisos de administrador de plataforma.");
  return next();
}

export async function getAccessibleOrganizations(user: AuthenticatedUser) {
  // A platform administrator reads nothing from its clients, but it does run a
  // shop of its own. Provisioning it on first sign-in means the account never
  // meets an empty application asking it to create something before it can
  // start. The membership is what grants the access; the platform claim grants
  // only the client screen.
  if (user.isPlatformAdmin) {
    const own = await platformService.findOwnedOrganizations(user.id);
    if (own.length > 0) return own;
    const { organization } = await platformService.createOwnOrganization(user.id, {
      name: DEFAULT_ADMINISTRATOR_SHOP_NAME,
      slug: "",
    });
    return [toOrganizationSummary(organization, "owner")];
  }

  const { data, error } = await supabase
    .from("organization_memberships")
    .select("role, organization:organizations(id, name, slug, status, logo_url)")
    .eq("user_id", user.id)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []).map((membership: any) => toOrganizationSummary(membership.organization, membership.role));
}
