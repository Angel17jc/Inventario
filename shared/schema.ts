import { pgTable, text, serial, integer, timestamp, decimal, varchar, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  contactInfo: text("contact_info"),
  address: text("address"),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMemberships = pgTable("organization_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  // Unique within the shop, not across the platform: migration 003 dropped the
  // global constraint for a partial index on (organization_id, sku). Declaring
  // .unique() here described a rule the database does not have, and in a
  // multi-tenant schema that is the wrong rule to leave written down — it says
  // one licorería's codes can collide with another's.
  sku: text("sku"),
  quantity: integer("quantity").notNull().default(0),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  imageUrl: text("image_url"),
  minStockLevel: integer("min_stock_level").default(5),
  // Cómo se llama una de estas en la percha. El stock se cuenta en ella y la
  // venta se cobra por ella: no hay otra forma de vender.
  unitLabel: text("unit_label").notNull().default("unidad"),
});

export const movements = pgTable("movements", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  productId: integer("product_id").references(() => products.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'IN' entra, 'OUT' sale
  // Stock is always counted in base units, whatever left the counter.
  quantity: integer("quantity").notNull(),
  // Agrupa las líneas registradas en una misma venta, y lo que se cobró por
  // esta. El importe se guarda porque es un hecho del pasado: recalcularlo con
  // los precios de hoy da un número falso en cuanto alguien cambia uno.
  saleId: uuid("sale_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  userId: varchar("user_id"), // Optional linkage to auth user
});

export const creditAccounts = pgTable("credit_accounts", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  customerName: text("customer_name").notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  movementId: integer("movement_id").references(() => movements.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'partial', 'paid'
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const creditPayments = pgTable("credit_payments", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  creditAccountId: integer("credit_account_id").references(() => creditAccounts.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// === BASE SCHEMAS ===
// Tenant identity is resolved exclusively on the server from the authenticated request.
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, organizationId: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, organizationId: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, organizationId: true });
export const insertMovementSchema = createInsertSchema(movements).omit({ id: true, organizationId: true, createdAt: true, saleId: true, amount: true });
export const insertCreditAccountSchema = createInsertSchema(creditAccounts).omit({ id: true, organizationId: true, createdAt: true, updatedAt: true });
export const insertCreditPaymentSchema = createInsertSchema(creditPayments).omit({ id: true, organizationId: true, createdAt: true });

export const createCategoryRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).nullable().optional(),
});

export const updateCategoryRequestSchema = createCategoryRequestSchema.partial();

export const createSupplierRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contactInfo: z.string().trim().max(255).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
});

export const updateSupplierRequestSchema = createSupplierRequestSchema.partial();

// === EXPLICIT API CONTRACT TYPES ===

// Base types
export type Category = typeof categories.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Movement = typeof movements.$inferSelect;
export type CreditAccount = typeof creditAccounts.$inferSelect;
export type CreditPayment = typeof creditPayments.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertMovement = z.infer<typeof insertMovementSchema>;
export type InsertCreditAccount = z.infer<typeof insertCreditAccountSchema>;
export type InsertCreditPayment = z.infer<typeof insertCreditPaymentSchema>;

// Extended types for frontend display
export type ProductWithDetails = Product & {
  category?: Category | null;
  supplier?: Supplier | null;
};

export type MovementWithProduct = Movement & {
  product?: Product | null;
};

export type CreditAccountWithDetails = CreditAccount & {
  product?: Product | null;
  payments?: CreditPayment[];
};

// Request types
export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof updateCategoryRequestSchema>;

export type CreateSupplierRequest = z.infer<typeof createSupplierRequestSchema>;
export type UpdateSupplierRequest = z.infer<typeof updateSupplierRequestSchema>;

export type CreateProductRequest = InsertProduct;
export type UpdateProductRequest = Partial<InsertProduct>;


/**
 * The unit label in the plural.
 *
 * Adding an "s" is right for "botella" and "caja" and wrong for the label
 * every shop starts with: "unidad" became "unidads" on the movements screen,
 * in the history and in the presentations panel. Spanish forms the plural in
 * -es after a consonant, so the default needs the rule and not the shortcut.
 *
 * It is a rule of thumb for the words that go on a shelf — vowel takes -s,
 * -z turns into -ces, a word already ending in -s or -x does not change, and
 * anything else takes -es. It does not handle every noun in the language and
 * is not meant to.
 */
export function pluralOf(unitLabel: string): string {
  const word = unitLabel.trim();
  if (word === "") return word;
  const last = word.slice(-1).toLowerCase();
  if ("aeiou".includes(last)) return `${word}s`;
  if (last === "z") return `${word.slice(0, -1)}ces`;
  if (last === "s" || last === "x") return word;
  return `${word}es`;
}

/** The words to put beside a figure: "2 Caja de 12", "6 botellas". */
export function describeQuantity(quantity: number, unitLabel: string): string {
  return `${quantity} ${quantity === 1 ? unitLabel : pluralOf(unitLabel)}`;
}

// Se vende por unidad y solo por unidad: la cantidad es cuántas salieron.
const soldQuantity = z.coerce.number().int().min(1, "Registra al menos una unidad.").max(1_000_000);

export const saleLineSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: soldQuantity,
});

export const createSaleRequestSchema = z.object({
  items: z.array(saleLineSchema).min(1, "Agrega al menos un producto.").max(100),
});

export type SaleLine = z.infer<typeof saleLineSchema>;
export type CreateSaleRequest = z.infer<typeof createSaleRequestSchema>;
export interface SaleResult { saleId: string; total: number; }

export const createCreditAccountRequestSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  productId: z.coerce.number().int().positive(),
  quantity: soldQuantity,
  notes: z.string().trim().max(500).nullable().optional(),
});

export const createCreditPaymentRequestSchema = z.object({
  creditAccountId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive().max(1_000_000).transform((amount) => amount.toFixed(2)),
  paymentMethod: z.string().trim().min(1).max(50).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type CreateCreditAccountRequest = z.infer<typeof createCreditAccountRequestSchema>;
export type CreateCreditPaymentRequest = z.infer<typeof createCreditPaymentRequestSchema>;

// Stats types
export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  /** Lo cobrado hoy, en el día del local. Incluye lo fiado: la mercadería salió. */
  soldToday: number;
  /** Lo cobrado menos lo que costó, con el costo de la presentación vendida. */
  profitToday: number;
  /** Cuántas ventas se registraron hoy, contando cada una una sola vez. */
  salesToday: number;
  recentMovements: MovementWithProduct[];
  weeklyActivity: Array<{ date: string; label: string; inbound: number; outbound: number }>;
}

export interface CreditsStats {
  totalDebt: number;
  totalCustomers: number;
  pendingAccounts: number;
}

// Account password rules. Declared here so the browser can give live feedback
// against the same definition the API enforces; the API is the authority.
export const passwordRules = [
  { label: "Al menos 8 caracteres", isMet: (value: string) => value.length >= 8 },
  { label: "Un número o un carácter especial", isMet: (value: string) => /[\d\W_]/.test(value) },
] as const;

export const accountPasswordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(128, "La contraseña no puede superar los 128 caracteres.")
  .refine((value) => /[\d\W_]/.test(value), "La contraseña debe incluir un número o un carácter especial.");


// Shop identity, editable by its owner.
export const updateOrganizationRequestSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(120, "El nombre no puede superar los 120 caracteres."),
});

export type UpdateOrganizationRequest = z.infer<typeof updateOrganizationRequestSchema>;

/** Bounded so a logo stays something the interface can load quickly. */
export const LOGO_MAX_BYTES = 512 * 1024;
export const LOGO_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

// ============================================
// HISTORIAL
// ============================================

/**
 * One line of the shop's day. Stock and money are kept in separate tables —
 * a payment has no product and movements.product_id is not nullable — so they
 * are brought together for reading and nowhere else.
 */
export interface LedgerMovementEntry {
  kind: "movement";
  id: number;
  at: string;
  type: "IN" | "OUT";
  /** Always in base units, whatever presentation was used. */
  quantity: number;
  /** Groups the lines registered in one sale. Null for a lone movement. */
  saleId: string | null;
  /** What this line was charged, at the price of the day. Null when nothing was. */
  amount: string | null;
  product: { id: number; name: string; unitLabel: string } | null;
  reason: string | null;
}

export interface LedgerPaymentEntry {
  kind: "payment";
  id: number;
  at: string;
  amount: string;
  paymentMethod: string | null;
  customerName: string;
  notes: string | null;
}

export type LedgerEntry = LedgerMovementEntry | LedgerPaymentEntry;

