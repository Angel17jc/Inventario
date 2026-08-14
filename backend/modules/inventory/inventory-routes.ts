import type { Express, Request, RequestHandler } from "express";
import { z } from "zod";
import { api } from "@shared/routes";
import { createMovementRequestSchema } from "@shared/schema";
import { DatabaseStorage } from "../../storage";

type ScopedStorage = (request: Request) => DatabaseStorage;
interface InventoryRouteDependencies { requireManager: RequestHandler; requireOperator: RequestHandler; scopedStorage: ScopedStorage; }

const createProductSchema = api.products.create.input.extend({ quantity: z.coerce.number(), costPrice: z.coerce.number(), sellingPrice: z.coerce.number(), minStockLevel: z.coerce.number().optional(), categoryId: z.coerce.number().optional(), supplierId: z.coerce.number().optional() });
const updateProductSchema = api.products.update.input.extend({ quantity: z.coerce.number().optional(), costPrice: z.coerce.number().optional(), sellingPrice: z.coerce.number().optional(), minStockLevel: z.coerce.number().optional(), categoryId: z.coerce.number().optional(), supplierId: z.coerce.number().optional() });

export function registerInventoryRoutes(app: Express, { requireManager, requireOperator, scopedStorage }: InventoryRouteDependencies) {
  app.get(api.products.list.path, async (req, res) => res.json(await scopedStorage(req).getProducts()));
  app.get(api.products.get.path, async (req, res) => { const product = await scopedStorage(req).getProduct(Number(req.params.id)); return product ? res.json(product) : res.status(404).json({ message: "Product not found" }); });

  app.post(api.products.create.path, requireManager, async (req, res) => {
    try {
      const input = createProductSchema.parse(req.body);
      if (input.sku && await scopedStorage(req).getProductBySku(String(input.sku))) return res.status(409).json({ message: "SKU already exists" });
      return res.status(201).json(await scopedStorage(req).createProduct(input as any));
    } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message }); throw error; }
  });

  app.put(api.products.update.path, requireManager, async (req, res) => {
    try {
      const input = updateProductSchema.parse(req.body); const productId = Number(req.params.id);
      const existing = input.sku ? await scopedStorage(req).getProductBySku(String(input.sku)) : undefined;
      if (existing && existing.id !== productId) return res.status(409).json({ message: "SKU already exists" });
      return res.json(await scopedStorage(req).updateProduct(productId, input as any));
    } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message }); throw error; }
  });

  app.delete(api.products.delete.path, requireManager, async (req, res) => { try { await scopedStorage(req).deleteProduct(Number(req.params.id)); return res.status(204).send(); } catch (error: any) { return res.status(400).json({ message: error.message || "Error al eliminar el producto" }); } });
  app.get(api.movements.list.path, async (req, res) => res.json(await scopedStorage(req).getMovements()));
  app.post(api.movements.create.path, requireOperator, async (req, res) => { try { return res.status(201).json(await scopedStorage(req).createMovement(createMovementRequestSchema.parse(req.body))); } catch (error: any) { if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message }); return res.status(400).json({ message: error.message }); } });
}
