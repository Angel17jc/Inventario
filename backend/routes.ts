import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { supabase } from "./db.js";
import { getAccessibleOrganizations, requireAuthenticatedUser, requireOrganizationContext, requireOrganizationRole, requirePlatformAdmin } from "./auth.js";
import { registerCatalogRoutes } from "./modules/catalog/catalog-routes.js";
import { registerInventoryRoutes } from "./modules/inventory/inventory-routes.js";
import { registerCreditRoutes } from "./modules/credits/credit-routes.js";
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
  registerPlatformRoutes(app, { requirePlatformAdmin });
  app.use("/api", requireOrganizationContext);
  const requireManager = requireOrganizationRole("owner", "manager");
  const requireOperator = requireOrganizationRole("owner", "manager", "cashier");
  const scopedStorage = (req: Express.Request) => storage.forOrganization(req.organization!.id, req.user!.id);

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
