import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabase } from "./db";
import { getAccessibleOrganizations, requireAuthenticatedUser, requireOrganizationContext, requireOrganizationRole, requirePlatformAdmin } from "./auth";
import { platformService } from "./platform-service";
import { sendApiError } from "./errors";
import { registerCatalogRoutes } from "./modules/catalog/catalog-routes";
import { registerInventoryRoutes } from "./modules/inventory/inventory-routes";
import { registerCreditRoutes } from "./modules/credits/credit-routes";
import { api } from "@shared/routes";
import { createCreditAccountRequestSchema, createCreditPaymentRequestSchema, createMovementRequestSchema } from "@shared/schema";
import { z } from "zod";

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
  app.post("/api/platform/organizations", requirePlatformAdmin, async (req, res) => {
    const inputSchema = z.object({
      name: z.string().trim().min(2).max(120),
      slug: z.string().trim().max(120).optional().default(""),
      ownerEmail: z.string().trim().email().max(255),
      ownerPassword: z.string().min(12).max(128),
    });
    try {
      const input = inputSchema.parse(req.body);
      const result = await platformService.createOrganizationWithOwner(input);
      return res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
      throw error;
    }
  });
  app.post("/api/platform/organization-users", requirePlatformAdmin, async (req, res) => {
    const inputSchema = z.object({
      organizationId: z.string().uuid(),
      email: z.string().trim().email().max(255),
      password: z.string().min(12).max(128),
      role: z.enum(["manager", "cashier"]),
    });
    try {
      const input = inputSchema.parse(req.body);
      const user = await platformService.createOrganizationUser(input);
      return res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
      throw error;
    }
  });
  app.get("/api/platform/organizations/:organizationId/users", requirePlatformAdmin, async (req, res) => {
    const organizationId = z.string().uuid().parse(req.params.organizationId);
    res.json(await platformService.listOrganizationUsers(organizationId));
  });
  app.patch("/api/platform/organization-users/:userId", requirePlatformAdmin, async (req, res) => {
    const input = z.object({ organizationId: z.string().uuid(), role: z.enum(["manager", "cashier"]).optional(), status: z.enum(["active", "disabled"]).optional() }).refine((value) => value.role || value.status, "At least one change is required").parse({ ...req.body, userId: req.params.userId });
    res.json(await platformService.updateOrganizationUser({ ...input, userId: z.string().uuid().parse(req.params.userId) }));
  });
  app.patch("/api/platform/organizations/:organizationId/status", requirePlatformAdmin, async (req, res) => {
    const organizationId = z.string().uuid().parse(req.params.organizationId);
    const { status } = z.object({ status: z.enum(["active", "suspended"]) }).parse(req.body);
    res.json(await platformService.updateOrganizationStatus(organizationId, status));
  });
  app.post("/api/platform/users/:userId/reset-password", requirePlatformAdmin, async (req, res) => {
    const userId = z.string().uuid().parse(req.params.userId);
    const { password } = z.object({ password: z.string().min(12).max(128) }).parse(req.body);
    res.json(await platformService.resetUserPassword(userId, password));
  });
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

  // Seed Data (omitimos si la variable de entorno SKIP_SEED está activada)
  return httpServer;
}

async function seedDatabase() {
  try {
    const existingProducts = await storage.getProducts();
    if (existingProducts.length === 0) {
      console.log("Seeding database...");
      
      // Categories
      const cat1 = await storage.createCategory({ name: "Vinos", description: "Vinos tintos, blancos y rosados" });
      const cat2 = await storage.createCategory({ name: "Licores", description: "Whisky, Vodka, Ron, etc." });
      const cat3 = await storage.createCategory({ name: "Cervezas", description: "Nacionales e importadas" });

      // Suppliers
      const sup1 = await storage.createSupplier({ name: "Distribuidora Nacional", contactInfo: "555-0101", address: "Calle Principal 123" });
      const sup2 = await storage.createSupplier({ name: "Importados Premium", contactInfo: "555-0202", address: "Av. Central 456" });

      // Products
      await storage.createProduct({
        name: "Whisky Black Label 12 Años",
        description: "Botella de 750ml",
        sku: "WBL750",
        quantity: 24,
        costPrice: "35.00",
        sellingPrice: "55.00",
        categoryId: cat2.id,
        supplierId: sup2.id,
        minStockLevel: 10,
      });

      await storage.createProduct({
        name: "Vino Tinto Malbec Reserva",
        description: "Botella de 750ml, cosecha 2020",
        sku: "VMR2020",
        quantity: 50,
        costPrice: "12.00",
        sellingPrice: "25.00",
        categoryId: cat1.id,
        supplierId: sup1.id,
        minStockLevel: 12,
      });

      await storage.createProduct({
        name: "Cerveza Artesanal IPA",
        description: "Pack de 6 unidades",
        sku: "CAIPA6",
        quantity: 100,
        costPrice: "8.00",
        sellingPrice: "15.00",
        categoryId: cat3.id,
        supplierId: sup1.id,
        minStockLevel: 20,
      });
      
      console.log("Database seeded successfully.");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
    // Don't throw - allow app to start anyway
  }
}
