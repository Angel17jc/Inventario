import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { supabase } from "./db.js";
import { getAccessibleOrganizations, requireAuthenticatedUser, requireOrganizationContext, requireOrganizationRole, requirePlatformAdmin } from "./auth.js";
import { registerCatalogRoutes } from "./modules/catalog/catalog-routes.js";
import { registerInventoryRoutes } from "./modules/inventory/inventory-routes.js";
import { registerCreditRoutes } from "./modules/credits/credit-routes.js";
import { registerOrganizationRoutes } from "./modules/organization/organization-routes.js";
import { registerPlatformRoutes } from "./modules/platform/platform-routes.js";
import { api } from "../shared/routes.js";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/health/database", async (_req, res, next) => {
    const { error } = await supabase
      .from("organizations")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) return next(error);

    return res.json({ status: "ok", database: "reachable", timestamp: new Date().toISOString() });
  });

  app.use("/api", requireAuthenticatedUser);
  app.get("/api/organizations/me", async (req, res) => {
    res.json(await getAccessibleOrganizations(req.user!));
  });
  // A password is set by the browser against Supabase, not here. The admin key
  // changes a password without asking for the old one, and nothing in the JWT
  // says whether a session came from a recovery link — amr reads
  // `[{ method: "otp" }]` for a recovery and for an ordinary sign-in alike — so
  // this endpoint could not tell the person who forgot their password from a
  // stolen token, and had to let both through. Supabase knows the difference.

  registerPlatformRoutes(app, { requirePlatformAdmin });
  app.use("/api", requireOrganizationContext);
  const requireManager = requireOrganizationRole("owner", "manager");
  const requireOperator = requireOrganizationRole("owner", "manager", "cashier");
  const scopedStorage = (req: Express.Request) => storage.forOrganization(req.organization!.id, req.user!.id);

  // Only the owner changes the shop's own identity.
  const requireOwner = requireOrganizationRole("owner");
  // A logo arrives as raw image bytes, so it bypasses the JSON parser. The
  // limit is enforced again in the handler against the shared constant.
  const readLogoUpload = express.raw({ type: ["image/png", "image/jpeg", "image/webp"], limit: "1mb" });
  registerOrganizationRoutes(app, { requireOwner, readLogoUpload });

  registerCatalogRoutes(app, { requireManager, scopedStorage });
  registerInventoryRoutes(app, { requireManager, requireOperator, scopedStorage });
  registerCreditRoutes(app, { requireOperator, scopedStorage });

  // Stats
  app.get(api.stats.get.path, async (req, res) => {
    const stats = await scopedStorage(req).getDashboardStats();
    res.json(stats);
  });

  return httpServer;
}
