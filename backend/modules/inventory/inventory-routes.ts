import type { Express, Request, RequestHandler } from "express";
import { z } from "zod";
import { api } from "../../../shared/routes.js";
import { createMovementRequestSchema, createProductPackRequestSchema } from "../../../shared/schema.js";
import { DatabaseStorage } from "../../storage.js";
import { createProductSchema, updateProductSchema } from "./inventory-schemas.js";
import { fail, sendApiError } from "../../errors.js";
import { errorCodes } from "../../../shared/errors.js";

const ledgerLimitSchema = z.coerce.number().int().min(1).max(200).default(50);

type ScopedStorage = (request: Request) => DatabaseStorage;
interface InventoryRouteDependencies { requireManager: RequestHandler; requireOperator: RequestHandler; scopedStorage: ScopedStorage; }

export function registerInventoryRoutes(app: Express, { requireManager, requireOperator, scopedStorage }: InventoryRouteDependencies) {
  app.get(api.products.list.path, async (req, res) => res.json(await scopedStorage(req).getProducts()));
  app.get(api.products.get.path, async (req, res) => { const product = await scopedStorage(req).getProduct(Number(req.params.id)); return product ? res.json(product) : fail(res, 404, errorCodes.notFound, "No encontramos ese producto."); });

  app.post(api.products.create.path, requireManager, async (req, res) => {
    try {
      const input = createProductSchema.parse(req.body);
      if (input.sku && await scopedStorage(req).getProductBySku(String(input.sku))) return fail(res, 409, errorCodes.conflict, "Ya existe un producto con ese código SKU.");
      return res.status(201).json(await scopedStorage(req).createProduct(input as any));
    } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message }); throw error; }
  });

  app.put(api.products.update.path, requireManager, async (req, res) => {
    try {
      const input = updateProductSchema.parse(req.body); const productId = Number(req.params.id);
      const existing = input.sku ? await scopedStorage(req).getProductBySku(String(input.sku)) : undefined;
      if (existing && existing.id !== productId) return fail(res, 409, errorCodes.conflict, "Ya existe un producto con ese código SKU.");
      return res.json(await scopedStorage(req).updateProduct(productId, input as any));
    } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message }); throw error; }
  });

  app.delete(api.products.delete.path, requireManager, async (req, res) => { try { await scopedStorage(req).deleteProduct(Number(req.params.id)); return res.status(204).send(); } catch (error) { return sendApiError(res, error); } });
  app.get("/api/products/:id/presentaciones", async (req, res) => {
    try {
      return res.json(await scopedStorage(req).getProductPacks(Number(req.params.id)));
    } catch (error) { return sendApiError(res, error); }
  });

  app.post("/api/products/:id/presentaciones", requireManager, async (req, res) => {
    try {
      const input = createProductPackRequestSchema.parse(req.body);
      const created = await scopedStorage(req).createProductPack(Number(req.params.id), {
        label: input.label,
        units: input.units,
        price: input.price === null || input.price === undefined ? null : String(input.price),
      });
      return res.status(201).json(created);
    } catch (error) { return sendApiError(res, error); }
  });

  app.delete("/api/presentaciones/:packId", requireManager, async (req, res) => {
    try {
      await scopedStorage(req).deleteProductPack(Number(req.params.packId));
      return res.status(204).send();
    } catch (error) { return sendApiError(res, error); }
  });

  app.get(api.movements.list.path, async (req, res) => res.json(await scopedStorage(req).getMovements()));

  // Stock and money on one line of time. Bounded on purpose: the shop reads
  // the last part of its day here, not its whole history.
  app.get("/api/movimientos/historial", async (req, res) => {
    try {
      const limit = ledgerLimitSchema.parse(req.query.limit);
      return res.json(await scopedStorage(req).getLedger(limit));
    } catch (error) {
      if (error instanceof z.ZodError) return fail(res, 400, errorCodes.validation, "El número de registros solicitado no es válido.");
      return sendApiError(res, error);
    }
  });
  app.post(api.movements.create.path, requireOperator, async (req, res) => { try { return res.status(201).json(await scopedStorage(req).createMovement(createMovementRequestSchema.parse(req.body))); } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message }); return sendApiError(res, error); } });
}
