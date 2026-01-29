import { db } from "./db";
import {
  categories, suppliers, products, movements,
  type Category, type Supplier, type Product, type Movement,
  type InsertCategory, type InsertSupplier, type InsertProduct, type InsertMovement,
  type UpdateCategoryRequest, type UpdateSupplierRequest, type UpdateProductRequest,
  type DashboardStats
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: UpdateCategoryRequest): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: UpdateSupplierRequest): Promise<Supplier>;
  deleteSupplier(id: number): Promise<void>;

  // Products
  getProducts(): Promise<(Product & { category: Category | null, supplier: Supplier | null })[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: UpdateProductRequest): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Movements
  getMovements(): Promise<(Movement & { product: Product | null })[]>;
  createMovement(movement: InsertMovement): Promise<Movement>;

  // Stats
  getDashboardStats(): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: UpdateCategoryRequest): Promise<Category> {
    const [updated] = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers);
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: number, supplier: UpdateSupplierRequest): Promise<Supplier> {
    const [updated] = await db.update(suppliers).set(supplier).where(eq(suppliers.id, id)).returning();
    return updated;
  }

  async deleteSupplier(id: number): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  // Products
  async getProducts(): Promise<(Product & { category: Category | null, supplier: Supplier | null })[]> {
    return await db.query.products.findMany({
      with: {
        category: true,
        supplier: true,
      },
    });
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: UpdateProductRequest): Promise<Product> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Movements
  async getMovements(): Promise<(Movement & { product: Product | null })[]> {
    return await db.query.movements.findMany({
      with: {
        product: true,
      },
      orderBy: [desc(movements.createdAt)],
    });
  }

  async createMovement(movement: InsertMovement): Promise<Movement> {
    // Transaction to update product stock
    return await db.transaction(async (tx) => {
      const [newMovement] = await tx.insert(movements).values(movement).returning();
      
      const product = await tx.query.products.findFirst({
        where: eq(products.id, movement.productId)
      });

      if (product) {
        let newQuantity = product.quantity;
        if (movement.type === 'IN') {
          newQuantity += movement.quantity;
        } else if (movement.type === 'OUT') {
          newQuantity -= movement.quantity;
        } else if (movement.type === 'ADJUSTMENT') {
          newQuantity = movement.quantity; // Adjustment sets the absolute value
        }

        await tx.update(products)
          .set({ quantity: newQuantity })
          .where(eq(products.id, movement.productId));
      }

      return newMovement;
    });
  }

  // Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const totalProductsResult = await db.select({ count: sql<number>`count(*)` }).from(products);
    const totalProducts = Number(totalProductsResult[0]?.count || 0);

    const totalValueResult = await db.select({ 
      value: sql<number>`sum(${products.quantity} * ${products.costPrice})` 
    }).from(products);
    const totalValue = Number(totalValueResult[0]?.value || 0);

    const lowStockResult = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(sql`${products.quantity} <= ${products.minStockLevel}`);
    const lowStockCount = Number(lowStockResult[0]?.count || 0);

    const recentMovements = await db.query.movements.findMany({
      with: { product: true },
      orderBy: [desc(movements.createdAt)],
      limit: 5,
    });

    return {
      totalProducts,
      totalValue,
      lowStockCount,
      recentMovements,
    };
  }
}

export const storage = new DatabaseStorage();
