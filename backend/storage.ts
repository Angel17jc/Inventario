import { supabase } from "./db.js";
import { lastSevenShopDays, shopDayKey } from "./shop-time.js";
import type {
  Category, Supplier, Product, Movement, CreditAccount, CreditPayment,
  InsertCategory, InsertSupplier, InsertProduct, InsertCreditAccount, InsertCreditPayment,
  UpdateCategoryRequest, UpdateSupplierRequest, UpdateProductRequest,
  DashboardStats, CreditAccountWithDetails, CreditsStats, CreateCreditAccountRequest, CreateCreditPaymentRequest,
  LedgerEntry, CreateSaleRequest, SaleResult
} from "../shared/schema.js";
import { unitCostFromPurchase } from "../shared/schema.js";

// Helper functions to convert between camelCase and snake_case
function toSnakeCase(obj: any): any {
  if (!obj) return obj;
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = value;
  }
  return result;
}

function toCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = typeof value === 'object' && value !== null ? toCamelCase(value) : value;
  }
  return result;
}

export interface IStorage {
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: UpdateCategoryRequest): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: UpdateSupplierRequest): Promise<Supplier>;
  deleteSupplier(id: number): Promise<void>;
  
  getProducts(): Promise<(Product & { category: Category | null, supplier: Supplier | null })[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: UpdateProductRequest): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  
  getLedger(limit: number): Promise<LedgerEntry[]>;
  createSale(sale: CreateSaleRequest): Promise<SaleResult>;
  
  getCreditAccounts(): Promise<CreditAccountWithDetails[]>;
  getCreditAccountsByCustomer(customerName: string): Promise<CreditAccountWithDetails[]>;
  getCreditAccount(id: number): Promise<CreditAccountWithDetails | undefined>;
  createCreditAccount(credit: CreateCreditAccountRequest): Promise<CreditAccount>;
  createCreditPayment(payment: CreateCreditPaymentRequest): Promise<CreditPayment>;
  getCreditsStats(): Promise<CreditsStats>;
  
  getDashboardStats(): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  constructor(private readonly organizationId?: string, private readonly actorId?: string) {}

  forOrganization(organizationId: string, actorId?: string): DatabaseStorage {
    return new DatabaseStorage(organizationId, actorId);
  }

  private get organizationScope(): string {
    if (!this.organizationId) throw new Error("Organization context is required for data access");
    return this.organizationId;
  }

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*').eq('organization_id', this.organizationScope);
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const { data, error } = await supabase.from('categories').select('*').eq('id', id).eq('organization_id', this.organizationScope).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const { data, error } = await supabase.from('categories').insert({ ...toSnakeCase(category), organization_id: this.organizationScope }).select().single();
    if (error) throw error;
    return toCamelCase(data);
  }

  async updateCategory(id: number, category: UpdateCategoryRequest): Promise<Category> {
    const snakeData = toSnakeCase(category);
    const { data, error } = await supabase.from('categories').update(snakeData).eq('id', id).eq('organization_id', this.organizationScope).select().single();
    if (error) throw error;
    return toCamelCase(data);
  }

  async deleteCategory(id: number): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id).eq('organization_id', this.organizationScope);
    if (error) throw error;
  }

  async getSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase.from('suppliers').select('*').eq('organization_id', this.organizationScope);
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).eq('organization_id', this.organizationScope).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : undefined;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const { data, error } = await supabase.from('suppliers').insert({ ...toSnakeCase(supplier), organization_id: this.organizationScope }).select().single();
    if (error) throw error;
    return toCamelCase(data);
  }

  async updateSupplier(id: number, supplier: UpdateSupplierRequest): Promise<Supplier> {
    const snakeData = toSnakeCase(supplier);
    const { data, error } = await supabase.from('suppliers').update(snakeData).eq('id', id).eq('organization_id', this.organizationScope).select().single();
    if (error) throw error;
    return toCamelCase(data);
  }

  async deleteSupplier(id: number): Promise<void> {
    const { error } = await supabase.from('suppliers').delete().eq('id', id).eq('organization_id', this.organizationScope);
    if (error) throw error;
  }

  async getProducts(): Promise<(Product & { category: Category | null, supplier: Supplier | null })[]> {
    const { data, error } = await supabase.from('products').select('*, category:categories(*), supplier:suppliers(*)').eq('organization_id', this.organizationScope).is('retired_at', null);
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).eq('organization_id', this.organizationScope).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : undefined;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const { data, error } = await supabase.from('products').select('*').eq('sku', sku).eq('organization_id', this.organizationScope).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : undefined;
  }

  /**
   * El costo por unidad se calcula aquí y no se acepta de fuera.
   *
   * El formulario pide lo que dice la factura — cuántas unidades trae la compra
   * y cuánto costó — porque es el número que la persona tiene delante. Dividir
   * en el servidor deja un solo sitio donde puede estar mal.
   */
  private conCostoDerivado<T extends { purchaseUnits?: number | null; purchasePrice?: number | string | null }>(
    product: T,
    costoAnterior: number | string = 0,
  ) {
    if (product.purchaseUnits === undefined && product.purchasePrice === undefined) return product;
    return {
      ...product,
      costPrice: unitCostFromPurchase(product.purchaseUnits, product.purchasePrice, costoAnterior).toFixed(4),
    };
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const conCosto = this.conCostoDerivado(product as any);
    const { data, error } = await supabase.from('products').insert({ ...toSnakeCase(conCosto), organization_id: this.organizationScope }).select().single();
    if (error) throw error;
    return toCamelCase(data);
  }

  /**
   * Buying is recorded by editing the product, so this is where stock enters
   * the shop. It used to write products.quantity straight, which left no trace
   * at all: the history promised everything that comes in and out and showed
   * nothing coming in, and anyone could rewrite the count with no record of
   * having done it.
   *
   * The quantity now goes through set_product_stock, which fixes the figure and
   * writes the movement that explains it with the row locked. Everything else
   * about the product is an ordinary update.
   */
  async updateProduct(id: number, product: UpdateProductRequest): Promise<Product> {
    const { quantity, ...rest } = product;

    if (Object.keys(rest).length > 0) {
      // El costo anterior sirve de red: una edición que solo toca el precio de
      // venta no debe dejar el costo en cero.
      const anterior = await this.getProduct(id);
      const { error } = await supabase
        .from('products')
        .update(toSnakeCase(this.conCostoDerivado(rest as any, anterior?.costPrice ?? 0)))
        .eq('id', id)
        .eq('organization_id', this.organizationScope);
      if (error) throw error;
    }

    if (quantity !== undefined) {
      const { error } = await (supabase as any).rpc('set_product_stock', {
        p_organization_id: this.organizationScope,
        p_product_id: id,
        p_quantity: quantity,
        p_user_id: this.actorId ?? null,
      });
      if (error) throw error;
    }

    const updated = await this.getProduct(id);
    if (!updated) throw new Error('Product not found in organization');
    return updated;
  }

  /**
   * Takes a product off the shelf and leaves its history alone.
   *
   * It used to read the credit accounts, decide, delete the paid ones and then
   * delete the product — four statements with nothing holding them together. A
   * fiado registered in between was lost, and deleting a paid account destroys
   * the record that a customer paid, which is the shop's accounting rather
   * than a catalogue detail. The function in migration 017 counts and retires
   * with the product row locked, and refuses with LM001 when money is owed.
   */
  async deleteProduct(id: number): Promise<void> {
    const { error } = await supabase.rpc('retire_product', {
      p_organization_id: this.organizationScope,
      p_product_id: id,
    });
    if (error) throw error;
  }

  /**
   * Everything that happened, stock and money on one line of time.
   *
   * The two tables stay apart: a movement always has a product and a payment
   * never does, so merging them in the database would mean a column that is
   * empty half the time. They are read separately and interleaved here, each
   * side asked for at most as many rows as the answer can hold.
   */
  async getLedger(limit: number): Promise<LedgerEntry[]> {
    const [movementsResult, paymentsResult] = await Promise.all([
      supabase
        .from('movements')
        .select('id, type, quantity, sale_id, amount, reason, created_at, product:products(id, name, unit_label)')
        .eq('organization_id', this.organizationScope)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('credit_payments')
        .select('id, credit_account_id, amount, payment_method, notes, created_at')
        .eq('organization_id', this.organizationScope)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);
    if (movementsResult.error) throw movementsResult.error;
    if (paymentsResult.error) throw paymentsResult.error;

    const payments = (paymentsResult.data ?? []) as any[];
    // Whose debt was paid. Looked up rather than embedded so the reading does
    // not depend on which foreign keys PostgREST can see between the two.
    const customerByAccount = new Map<number, string>();
    const accountIds = Array.from(new Set<number>(payments.map((payment) => payment.credit_account_id)));
    if (accountIds.length > 0) {
      const { data, error } = await supabase
        .from('credit_accounts')
        .select('id, customer_name')
        .in('id', accountIds)
        .eq('organization_id', this.organizationScope);
      if (error) throw error;
      for (const account of (data ?? []) as any[]) customerByAccount.set(account.id, account.customer_name);
    }

    const entries: LedgerEntry[] = [
      ...((movementsResult.data ?? []) as any[]).map((movement): LedgerEntry => ({
        kind: 'movement',
        id: movement.id,
        at: movement.created_at,
        type: movement.type,
        quantity: movement.quantity,
        saleId: movement.sale_id ?? null,
        amount: movement.amount === null || movement.amount === undefined ? null : String(movement.amount),
        product: movement.product
          ? { id: movement.product.id, name: movement.product.name, unitLabel: movement.product.unit_label ?? 'unidad' }
          : null,
        reason: movement.reason ?? null,
      })),
      ...payments.map((payment): LedgerEntry => ({
        kind: 'payment',
        id: payment.id,
        at: payment.created_at,
        amount: String(payment.amount),
        paymentMethod: payment.payment_method ?? null,
        customerName: customerByAccount.get(payment.credit_account_id) ?? 'Cliente',
        notes: payment.notes ?? null,
      })),
    ];

    // Compared as instants, not as text: the two tables can word the same
    // moment differently.
    entries.sort((first, second) => Date.parse(second.at) - Date.parse(first.at));
    return entries.slice(0, limit);
  }

  /**
   * A whole sale: several products handed over at once, charged together.
   *
   * The lines travel as one call because they are one transaction. The function
   * locks each product as it reads it and refuses the lot if any line is wrong;
   * half a sale on the shelf and none in the register is worse than neither.
   */
  async createSale(sale: CreateSaleRequest): Promise<SaleResult> {
    const { data, error } = await (supabase as any).rpc('create_sale', {
      p_organization_id: this.organizationScope,
      p_items: sale.items,
      p_user_id: this.actorId ?? null,
    });
    if (error) throw error;
    const fila = Array.isArray(data) ? data[0] : data;
    return { saleId: fila.sale_id, total: Number(fila.total) };
  }

  async getCreditAccounts(): Promise<CreditAccountWithDetails[]> {
    const { data, error } = await supabase
      .from('credit_accounts')
      .select('*, product:products(*), payments:credit_payments(*)')
      .eq('organization_id', this.organizationScope)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async getCreditAccountsByCustomer(customerName: string): Promise<CreditAccountWithDetails[]> {
    const { data, error } = await supabase
      .from('credit_accounts')
      .select('*, product:products(*), payments:credit_payments(*)')
      .eq('customer_name', customerName)
      .eq('organization_id', this.organizationScope)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamelCase);
  }

  async getCreditAccount(id: number): Promise<CreditAccountWithDetails | undefined> {
    const { data, error } = await supabase
      .from('credit_accounts')
      .select('*, product:products(*), payments:credit_payments(*)')
      .eq('id', id)
      .eq('organization_id', this.organizationScope)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCase(data) : undefined;
  }

  async createCreditAccount(credit: CreateCreditAccountRequest): Promise<CreditAccount> {
    const { data, error } = await supabase.rpc('create_credit_sale', {
      p_organization_id: this.organizationScope,
      p_product_id: credit.productId,
      p_customer_name: credit.customerName,
      p_quantity: credit.quantity,
      p_notes: credit.notes ?? undefined,
      p_user_id: this.actorId ?? undefined,
    });
    if (error) throw error;
    return toCamelCase(data[0]);
  }


  async createCreditPayment(payment: CreateCreditPaymentRequest): Promise<CreditPayment> {
    // El importe llega como cadena de dos decimales: createCreditPaymentRequest
    // lo valida como número y lo fija con toFixed(2) antes de mandarlo, para
    // que Postgres lea un literal decimal exacto en vez de un flotante. Los
    // tipos generados declaran el argumento `number` porque la columna es
    // numeric; PostgREST acepta la cadena y la convierte sin pasar por un
    // double, que es justo lo que se quiere con dinero.
    const { data, error } = await supabase.rpc('register_credit_payment', {
      p_organization_id: this.organizationScope,
      p_credit_account_id: payment.creditAccountId,
      p_amount: payment.amount as unknown as number,
      p_payment_method: payment.paymentMethod ?? undefined,
      p_notes: payment.notes ?? undefined,
    });
    if (error) throw error;
    return toCamelCase(data[0]);
  }


  async getCreditsStats(): Promise<CreditsStats> {
    const { data: accounts, error } = await supabase.from('credit_accounts').select('*').eq('organization_id', this.organizationScope);
    if (error) throw error;

    const accountsData = accounts as any[] || [];
    const totalDebt = accountsData.reduce((sum, acc) => sum + parseFloat(acc.remaining_amount || '0'), 0);
    const uniqueCustomers = new Set(accountsData.map(acc => acc.customer_name)).size;
    const pendingAccounts = accountsData.filter(acc => acc.status === 'pending').length;

    return {
      totalDebt,
      totalCustomers: uniqueCustomers,
      pendingAccounts,
    };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const { count: totalProducts, error: countError } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('organization_id', this.organizationScope).is('retired_at', null);
    if (countError) throw countError;

    const { data: productsData, error: productsError } = await supabase.from('products').select('quantity, cost_price').eq('organization_id', this.organizationScope).is('retired_at', null);
    if (productsError) throw productsError;
    
    const totalValue = (productsData as any[])?.reduce((sum, p) => sum + (p.quantity * parseFloat(p.cost_price || '0')), 0) || 0;

    // Running out is the only stock warning the shop asked for: a minimum to
    // compare against was one more number to keep up to date for no gain.
    const lowStockCount = (productsData as any[])?.filter((product) => product.quantity <= 0).length || 0;

    // Se pide el día del local con un margen de un día a cada lado: la ventana
    // se corta en UTC y los días se cuentan en la zona de la licorería.
    const dayStart = new Date(Date.now() - 36 * 60 * 60 * 1000);
    const { data: todayRows, error: todayError } = await (supabase as any)
      .from('movements')
      .select('sale_id, amount, quantity, created_at, product:products(cost_price)')
      .eq('organization_id', this.organizationScope)
      .eq('type', 'OUT')
      .not('amount', 'is', null)
      .gte('created_at', dayStart.toISOString());
    if (todayError) throw todayError;

    const today = shopDayKey(new Date());
    const ventasDeHoy = new Set<string>();
    let soldToday = 0;
    let costToday = 0;
    for (const row of (todayRows as any[]) ?? []) {
      if (!row.created_at || shopDayKey(new Date(row.created_at)) !== today) continue;
      soldToday += Number(row.amount);
      // Lo que costó lo que salió, al costo por unidad del producto.
      costToday += Number(row.quantity) * Number(row.product?.cost_price ?? 0);
      // Una venta de tres productos es una venta. Las líneas sueltas, de antes
      // de que existieran las ventas agrupadas, cuentan una cada una.
      ventasDeHoy.add(row.sale_id ?? `suelta:${row.created_at}`);
    }

    const { data: recentMovements, error: movementsError } = await supabase.from('movements').select('*, product:products(*)').eq('organization_id', this.organizationScope).order('created_at', { ascending: false }).limit(5);
    if (movementsError) throw movementsError;

    // Eight days back, not seven: the window is cut in UTC and the days are
    // counted in the shop's zone, so the extra day covers the difference. The
    // rows it brings in fall outside every bucket and are dropped below.
    const windowStart = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const { data: activityRows, error: activityError } = await supabase
      .from('movements')
      .select('type, quantity, created_at')
      .eq('organization_id', this.organizationScope)
      .gte('created_at', windowStart.toISOString());
    if (activityError) throw activityError;

    const activityByDate = new Map<string, { date: string; label: string; inbound: number; outbound: number }>();
    for (const day of lastSevenShopDays()) {
      activityByDate.set(day.date, { ...day, inbound: 0, outbound: 0 });
    }
    for (const movement of (activityRows as any[]) ?? []) {
      // The day the shop was open, not the day UTC was having. A sale at 20:30
      // in Guayaquil belongs to that Tuesday, not to Wednesday.
      const bucket = movement.created_at ? activityByDate.get(shopDayKey(new Date(movement.created_at))) : undefined;
      if (!bucket) continue;
      if (movement.type === 'IN') bucket.inbound += movement.quantity;
      if (movement.type === 'OUT') bucket.outbound += movement.quantity;
    }

    return {
      totalProducts: totalProducts || 0,
      totalValue,
      lowStockCount,
      soldToday: Math.round(soldToday * 100) / 100,
      profitToday: Math.round((soldToday - costToday) * 100) / 100,
      salesToday: ventasDeHoy.size,
      recentMovements: (recentMovements || []).map(toCamelCase),
      weeklyActivity: Array.from(activityByDate.values()),
    };
  }
}

export const storage = new DatabaseStorage();
