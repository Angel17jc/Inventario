import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getAccessibleOrganizations, requireAuthenticatedUser, requireOrganizationContext, requireOrganizationRole, requirePlatformAdmin } from "./auth";
import { platformService } from "./platform-service";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
  app.use("/api", requireOrganizationContext);
  const requireManager = requireOrganizationRole("owner", "manager");
  const requireOperator = requireOrganizationRole("owner", "manager", "cashier");
  const scopedStorage = (req: Express.Request) => storage.forOrganization(req.organization!.id);

  // Categories
  app.get(api.categories.list.path, async (req, res) => {
    const categories = await scopedStorage(req).getCategories();
    res.json(categories);
  });

  app.get(api.categories.get.path, async (req, res) => {
    const category = await scopedStorage(req).getCategory(Number(req.params.id));
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  });

  app.post(api.categories.create.path, requireManager, async (req, res) => {
    try {
      const input = api.categories.create.input.parse(req.body);
      const category = await scopedStorage(req).createCategory(input);
      res.status(201).json(category);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.categories.update.path, requireManager, async (req, res) => {
    try {
      const input = api.categories.update.input.parse(req.body);
      const category = await scopedStorage(req).updateCategory(Number(req.params.id), input);
      res.json(category);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.categories.delete.path, requireManager, async (req, res) => {
    await scopedStorage(req).deleteCategory(Number(req.params.id));
    res.status(204).send();
  });

  // Suppliers
  app.get(api.suppliers.list.path, async (req, res) => {
    const suppliers = await scopedStorage(req).getSuppliers();
    res.json(suppliers);
  });

  app.get(api.suppliers.get.path, async (req, res) => {
    const supplier = await scopedStorage(req).getSupplier(Number(req.params.id));
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(supplier);
  });

  app.post(api.suppliers.create.path, requireManager, async (req, res) => {
    try {
      const input = api.suppliers.create.input.parse(req.body);
      const supplier = await scopedStorage(req).createSupplier(input);
      res.status(201).json(supplier);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.suppliers.update.path, requireManager, async (req, res) => {
    try {
      const input = api.suppliers.update.input.parse(req.body);
      const supplier = await scopedStorage(req).updateSupplier(Number(req.params.id), input);
      res.json(supplier);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.suppliers.delete.path, requireManager, async (req, res) => {
    await scopedStorage(req).deleteSupplier(Number(req.params.id));
    res.status(204).send();
  });

  // Products
  app.get(api.products.list.path, async (req, res) => {
    const products = await scopedStorage(req).getProducts();
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await scopedStorage(req).getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, requireManager, async (req, res) => {
    try {
      // Coerce numeric strings to numbers
      const bodySchema = api.products.create.input.extend({
        quantity: z.coerce.number(),
        costPrice: z.coerce.number(), // drizzle-zod expects number or string for decimal, but we want to ensure it's handled right
        sellingPrice: z.coerce.number(),
        minStockLevel: z.coerce.number().optional(),
        categoryId: z.coerce.number().optional(),
        supplierId: z.coerce.number().optional(),
      });
      const input = bodySchema.parse(req.body);
      // Validate SKU uniqueness before attempting insert
      if (input.sku) {
        const existing = await scopedStorage(req).getProductBySku(String(input.sku));
        if (existing) {
          return res.status(409).json({ message: 'SKU already exists' });
        }
      }
      // Convert numbers back to strings for decimal fields if needed, or let Drizzle handle it.
      // Drizzle 'decimal' type in Zod schema expects string or number, returns string.
      // We pass the parsed object which has numbers.
      const product = await scopedStorage(req).createProduct(input as any);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.products.update.path, requireManager, async (req, res) => {
    try {
       const bodySchema = api.products.update.input.extend({
        quantity: z.coerce.number().optional(),
        costPrice: z.coerce.number().optional(),
        sellingPrice: z.coerce.number().optional(),
        minStockLevel: z.coerce.number().optional(),
        categoryId: z.coerce.number().optional(),
        supplierId: z.coerce.number().optional(),
      });
      const input = bodySchema.parse(req.body);
      // If SKU is being updated, ensure uniqueness (excluding current product)
      if (input.sku) {
        const existing = await scopedStorage(req).getProductBySku(String(input.sku));
        if (existing && existing.id !== Number(req.params.id)) {
          return res.status(409).json({ message: 'SKU already exists' });
        }
      }
      const product = await scopedStorage(req).updateProduct(Number(req.params.id), input as any);
      res.json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.products.delete.path, requireManager, async (req, res) => {
    try {
      await scopedStorage(req).deleteProduct(Number(req.params.id));
      res.status(204).send();
    } catch (err: any) {
      // Si es una violación de integridad referencial u otro error controlado, devolver 400 con mensaje
      return res.status(400).json({ message: err.message || 'Error al eliminar el producto' });
    }
  });

  // Movements
  app.get(api.movements.list.path, async (req, res) => {
    const movements = await scopedStorage(req).getMovements();
    res.json(movements);
  });

  app.post(api.movements.create.path, requireOperator, async (req, res) => {
    try {
      const bodySchema = api.movements.create.input.extend({
        productId: z.coerce.number(),
        quantity: z.coerce.number(),
      });
      const input = bodySchema.parse(req.body);
      const movement = await scopedStorage(req).createMovement(input);
      res.status(201).json(movement);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(400).json({ message: err.message });
    }
  });

  // Credits
  app.get("/api/credits", async (req, res) => {
    const credits = await scopedStorage(req).getCreditAccounts();
    res.json(credits);
  });

  app.get("/api/credits/customer/:customerName", async (req, res) => {
    const credits = await scopedStorage(req).getCreditAccountsByCustomer(req.params.customerName);
    res.json(credits);
  });

  app.get("/api/credits/stats", async (req, res) => {
    const stats = await scopedStorage(req).getCreditsStats();
    res.json(stats);
  });

  app.post("/api/credits", requireOperator, async (req, res) => {
    try {
      const credit = await scopedStorage(req).createCreditAccount(req.body);
      res.status(201).json(credit);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/credits/payment", requireOperator, async (req, res) => {
    try {
      const payment = await scopedStorage(req).createCreditPayment(req.body);
      res.status(201).json(payment);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

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
