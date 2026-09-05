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
  // Stock is always counted in this unit. Presentations live in their own
  // table because one product has several: cases of 6 and of 12.
  unitLabel: text("unit_label").notNull().default("unidad"),
});

export const productPacks = pgTable("product_packs", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  productId: integer("product_id").notNull().references(() => products.id),
  label: text("label").notNull(),
  units: integer("units").notNull(),
  // What the case costs the shop and what the shop sells it for. Both are for
  // the whole case, which is how they appear on the invoice and on the shelf.
  cost: decimal("cost", { precision: 10, scale: 2 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const movements = pgTable("movements", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  productId: integer("product_id").references(() => products.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'IN' entra, 'OUT' sale
  // Stock is always counted in base units, whatever left the counter.
  quantity: integer("quantity").notNull(),
  // The presentation it was registered with, and what the person actually
  // typed: 2 against a quantity of 24 when the case holds twelve. NULL means
  // loose units, which is what every movement before presentations meant.
  packId: integer("pack_id").references(() => productPacks.id),
  enteredQuantity: integer("entered_quantity"),
  looseQuantity: integer("loose_quantity"),
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
// entered_quantity is derived by the database from the presentation. A caller
// able to set it could make the history disagree with the stock it moved.
export const insertMovementSchema = createInsertSchema(movements).omit({ id: true, organizationId: true, createdAt: true, enteredQuantity: true, looseQuantity: true });
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
  /** The presentation it was registered with, absent when sold loose. */
  pack?: Presentation | null;
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


// ============================================
// PRESENTACIONES
// ============================================

/** One way a product leaves the counter: a case of 12, a six pack. */
export interface Presentation {
  id: number;
  label: string;
  units: number;
  /** What the whole case costs the shop. Null when only the unit cost is known. */
  cost: string | null;
  /** What the whole case sells for. Null charges units × the unit price. */
  price: string | null;
}

/** Base units taken by `quantity` of `presentation`, or of loose units. */
export function toBaseUnits(quantity: number, presentation: Presentation | null): number {
  return presentation ? quantity * presentation.units : quantity;
}

/**
 * What one of these costs. A presentation without its own price is charged at
 * its size times the unit price, so a shop that does not discount by the case
 * has nothing to fill in.
 */
export function priceOf(presentation: Presentation | null, unitPrice: string | number): number {
  const perUnit = Number(unitPrice);
  if (!presentation) return perUnit;
  if (presentation.price !== null) return Number(presentation.price);
  return perUnit * presentation.units;
}

/**
 * What one unit of this presentation costs the shop. A case of twelve at
 * 17.00 puts each bottle at 1.42, which is what the stock is valued at.
 * Falls back to the product's own unit cost when the case cost is unknown.
 */
export function unitCostOf(presentation: Presentation | null, unitCost: string | number): number {
  const perUnit = Number(unitCost);
  if (!presentation || presentation.cost === null) return perUnit;
  return Number(presentation.cost) / presentation.units;
}

/**
 * What a sale of whole cases plus loose units comes to.
 *
 * The two are charged differently on purpose: six bottles bought loose cost
 * six times the unit price, while a case costs whatever the shop charges for
 * the case, which is normally less.
 */
export function chargeFor(
  packQuantity: number,
  looseQuantity: number,
  presentation: Presentation | null,
  unitPrice: string | number,
): number {
  const perUnit = Number(unitPrice);
  // With no presentation the first figure is already loose units — the same
  // reading toBaseUnits gives it, and the same one create_credit_sale applies
  // when p_pack_id is null. Charging it as nothing would put a sale at 0.00.
  const packs = presentation
    ? packQuantity * priceOf(presentation, perUnit)
    : packQuantity * perUnit;
  return packs + looseQuantity * perUnit;
}

/** The words to put beside a figure: "2 Caja de 12", "6 botellas". */

/**
 * How a sale of cases plus loose units reads back: "1 × Caja de 12 + 6
 * botellas". Whichever side is zero is left out, so a plain sale of six
 * bottles does not read as a sale of no cases.
 */
export function describeSale(
  packQuantity: number,
  looseQuantity: number,
  presentation: Presentation | null,
  unitLabel: string,
): string {
  const parts: string[] = [];
  if (presentation && packQuantity > 0) parts.push(`${packQuantity} × ${presentation.label}`);
  if (looseQuantity > 0) parts.push(describeQuantity(looseQuantity, null, unitLabel));
  if (parts.length === 0) return describeQuantity(0, null, unitLabel);
  return parts.join(" + ");
}

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
export function describeQuantity(quantity: number, presentation: Presentation | null, unitLabel: string): string {
  if (presentation) return `${quantity} × ${presentation.label}`;
  return `${quantity} ${quantity === 1 ? unitLabel : pluralOf(unitLabel)}`;
}

const mixedQuantities = {
  // Whole cases of the chosen presentation, and units sold loose beside them.
  // A shop hands over one case and six beers in a single sale, so either may
  // be zero but not both.
  quantity: z.coerce.number().int().min(0).max(1_000_000),
  looseQuantity: z.coerce.number().int().min(0).max(1_000_000).default(0),
  packId: z.coerce.number().int().positive().nullable().optional(),
};

const atLeastOneQuantity = (value: { quantity: number; looseQuantity: number }) =>
  value.quantity > 0 || value.looseQuantity > 0;
const nothingToRegister = { message: "Registra al menos una caja o una unidad." };

export const createMovementRequestSchema = z
  .object({
    productId: z.coerce.number().int().positive(),
    // Stock either comes in or goes out. ADJUSTMENT set the count to an
    // absolute figure, which is the shop rewriting its own stock without a
    // reason attached — the product decision took it off the screens and the
    // API kept accepting it. No movement in the database ever used it.
    type: z.enum(["IN", "OUT"]),
    reason: z.string().trim().max(500).nullable().optional(),
    ...mixedQuantities,
  })
  .refine(atLeastOneQuantity, nothingToRegister);

export const createCreditAccountRequestSchema = z
  .object({
    customerName: z.string().trim().min(2).max(120),
    productId: z.coerce.number().int().positive(),
    notes: z.string().trim().max(500).nullable().optional(),
    ...mixedQuantities,
  })
  .refine(atLeastOneQuantity, nothingToRegister);

export const createCreditPaymentRequestSchema = z.object({
  creditAccountId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive().max(1_000_000).transform((amount) => amount.toFixed(2)),
  paymentMethod: z.string().trim().min(1).max(50).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type CreateMovementRequest = z.infer<typeof createMovementRequestSchema>;
export type CreateCreditAccountRequest = z.infer<typeof createCreditAccountRequestSchema>;
export type CreateCreditPaymentRequest = z.infer<typeof createCreditPaymentRequestSchema>;

// Stats types
export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
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
  /** Whole cases the person typed: 2, when the case holds twelve. */
  enteredQuantity: number | null;
  /** Units sold loose beside those cases. */
  looseQuantity: number | null;
  pack: Presentation | null;
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

export const createProductPackRequestSchema = z.object({
  label: z.string().trim().min(2, "Ponle un nombre a la presentación.").max(60),
  units: z.coerce.number().int().min(2, "Una presentación agrupa al menos 2 unidades.").max(10_000),
  cost: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  price: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
});

export type CreateProductPackRequest = z.infer<typeof createProductPackRequestSchema>;
