import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactInfo: text("contact_info"),
  address: text("address"),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku").unique(),
  quantity: integer("quantity").notNull().default(0),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  imageUrl: text("image_url"),
  minStockLevel: integer("min_stock_level").default(5),
});

export const movements = pgTable("movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'IN', 'OUT', 'ADJUSTMENT'
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: varchar("user_id"), // Optional linkage to auth user
});

// === RELATIONS ===
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  movements: many(movements),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
}));

export const movementsRelations = relations(movements, ({ one }) => ({
  product: one(products, {
    fields: [movements.productId],
    references: [products.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertMovementSchema = createInsertSchema(movements).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===

// Base types
export type Category = typeof categories.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Movement = typeof movements.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertMovement = z.infer<typeof insertMovementSchema>;

// Extended types for frontend display
export type ProductWithDetails = Product & {
  category?: Category | null;
  supplier?: Supplier | null;
};

export type MovementWithProduct = Movement & {
  product?: Product | null;
};

// Request types
export type CreateCategoryRequest = InsertCategory;
export type UpdateCategoryRequest = Partial<InsertCategory>;

export type CreateSupplierRequest = InsertSupplier;
export type UpdateSupplierRequest = Partial<InsertSupplier>;

export type CreateProductRequest = InsertProduct;
export type UpdateProductRequest = Partial<InsertProduct>;

export type CreateMovementRequest = InsertMovement;

// Stats types
export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  recentMovements: MovementWithProduct[];
}
