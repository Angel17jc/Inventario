import { z } from "zod";
import { api } from "../../../shared/routes.js";

const optionalSkuSchema = z
  .string()
  .trim()
  .max(100)
  .transform((value) => value || null)
  .nullable()
  .optional();

const optionalReferenceIdSchema = z.coerce.number().int().positive().nullable().optional();

// Ni la descripción ni el stock mínimo los envía ya ninguna pantalla: el
// formulario dejó de pedirlos cuando el aviso pasó a ser solo "agotado". Se
// dejan de aceptar además de dejar de pedirse, para que la API no siga
// admitiendo campos que nadie escribe y nadie lee.
const productFields = {
  name: z.string().trim().min(2).max(160),
  sku: optionalSkuSchema,
  quantity: z.coerce.number().int().min(0).max(1_000_000),
  costPrice: z.coerce.number().min(0).max(1_000_000),
  sellingPrice: z.coerce.number().min(0).max(1_000_000),
  categoryId: optionalReferenceIdSchema,
  supplierId: optionalReferenceIdSchema,
  // What the shop calls one of these on the shelf. Stock is counted in it and
  // every presentation is a multiple of it.
  unitLabel: z.string().trim().min(2).max(40).optional(),
};

const camposRetirados = { description: true, minStockLevel: true } as const;

export const createProductSchema = api.products.create.input.omit(camposRetirados).extend(productFields);
export const updateProductSchema = api.products.update.input.omit(camposRetirados).extend({
  ...productFields,
  name: productFields.name.optional(),
  quantity: productFields.quantity.optional(),
  costPrice: productFields.costPrice.optional(),
  sellingPrice: productFields.sellingPrice.optional(),
});
