import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useToast } from "@/hooks/use-toast";
import { describeQuantity, pluralOf, type LedgerEntry } from "@shared/schema";
import { useCreateSale, useLedger } from "@/modules/inventory/movements/movement-queries";
import { useProducts } from "@/modules/inventory/products/product-queries";
import { Button } from "@/components/ui/button";
import { DataLoadError } from "@/components/ui/data-load-error";
import { describeError } from "@/lib/api-errors";
import { Input } from "@/components/ui/input";
import { ProductPicker } from "@/modules/inventory/products/components/ProductPicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMovementSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDown, ArrowUp, HandCoins, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** How each line of the day reads: its mark, its colour and its figure. */
function describeEntry(entry: LedgerEntry) {
  if (entry.kind === "payment") {
    return {
      icon: <HandCoins className="w-5 h-5" />,
      tone: "bg-amber-500/10 text-amber-400",
      title: `Abono de ${entry.customerName}`,
      amount: `+${Number(entry.amount).toFixed(2)}`,
      amountTone: "text-amber-400",
      note: entry.paymentMethod,
    };
  }

  const unitLabel = entry.product?.unitLabel ?? "unidad";
  return {
    icon: entry.type === "IN" ? <ArrowUp className="w-5 h-5" />
      : entry.type === "OUT" ? <ArrowDown className="w-5 h-5" />
      : <RefreshCw className="w-5 h-5" />,
    tone: entry.type === "IN" ? "bg-green-500/10 text-green-400"
      : entry.type === "OUT" ? "bg-red-500/10 text-red-400"
      : "bg-blue-500/10 text-blue-400",
    title: entry.product?.name ?? "Producto eliminado",
    amount: `${entry.type === "IN" ? "+" : "-"}${entry.quantity}`,
    amountTone: entry.type === "IN" ? "text-green-400" : "text-red-400",
    note: describeQuantity(entry.quantity, unitLabel),
  };
}

// Se vende por unidad: un producto y cuántas salieron. Lo que entra se anota
// en Inventario, corrigiendo el stock del producto.
const formSchema = z.object({
  productId: z.coerce.number().min(1, "Selecciona un producto"),
  quantity: z.coerce.number().min(1, "Registra al menos una unidad"),
});

const emptySale = { quantity: 1 } as const;

type MovementFormValues = z.infer<typeof formSchema>;

/** Una línea ya agregada a la venta en curso, con lo necesario para leerla. */
interface LineaDeVenta {
  clave: string;
  productId: number;
  quantity: number;
  nombre: string;
  unitLabel: string;
  importe: number;
}

export default function Movements() {
  const { data: entries, isLoading, isError, error, refetch, isFetching } = useLedger();
  const { data: products } = useProducts();
  const createSale = useCreateSale();
  const { toast } = useToast();
  const [lineas, setLineas] = useState<LineaDeVenta[]>([]);

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...emptySale },
  });

  const selectedProductId = Number(form.watch("productId")) || undefined;
  const product = products?.find((candidate) => candidate.id === selectedProductId);
  const unitLabel = product?.unitLabel ?? "unidad";

  const cantidad = Number(form.watch("quantity")) || 0;
  const charge = cantidad * Number(product?.sellingPrice ?? 0);
  const nothingToRegister = cantidad <= 0;

  const totalDeLaVenta = lineas.reduce((suma, linea) => suma + linea.importe, 0);

  function agregarLinea(data: MovementFormValues) {
    if (!product) return;
    setLineas((actuales) => [
      ...actuales,
      {
        clave: `${Date.now()}-${actuales.length}`,
        productId: product.id,
        quantity: cantidad,
        nombre: product.name,
        unitLabel,
        importe: charge,
      },
    ]);
    form.reset({ ...emptySale });
    void data;
  }

  function quitarLinea(clave: string) {
    setLineas((actuales) => actuales.filter((linea) => linea.clave !== clave));
  }

  function registrarVenta() {
    if (lineas.length === 0) return;

    // Lo que quedará de cada producto, sumando todas sus líneas de esta venta.
    const restantes = new Map<number, { nombre: string; unitLabel: string; queda: number }>();
    for (const linea of lineas) {
      const encontrado = products?.find((candidato) => candidato.id === linea.productId);
      const previo = restantes.get(linea.productId);
      restantes.set(linea.productId, {
        nombre: linea.nombre,
        unitLabel: linea.unitLabel,
        queda: (previo?.queda ?? encontrado?.quantity ?? 0) - linea.quantity,
      });
    }

    createSale.mutate(
      { items: lineas.map(({ productId, quantity }) => ({ productId, quantity })) },
      {
        onSuccess: () => {
          setLineas([]);
          form.reset({ ...emptySale });
          // La venta nunca se rechaza: se avisa de lo que dejó atrás, después.
          for (const producto of Array.from(restantes.values())) {
            if (producto.queda > 0) continue;
            toast({
              title: producto.queda < 0 ? `${producto.nombre} quedó en negativo` : `${producto.nombre} se agotó`,
              description: producto.queda < 0
                ? `El registro dice ${describeQuantity(producto.queda, producto.unitLabel)}: se vendió más de lo que había contado. Corrige el stock en Inventario cuando puedas.`
                : "No queda nada en el registro. Repón antes de la próxima venta.",
              variant: "destructive",
            });
          }
        },
      },
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-white mb-2">Ventas y movimientos</h1>
            <p className="text-muted-foreground">Registra lo que sale del local. Lo que entra se anota al editar el producto en Inventario.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <Card className="bg-card border-border shadow-xl h-fit">
              <CardHeader>
                <CardTitle className="text-primary font-display">Registrar Venta</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(agregarLinea)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <ProductPicker
                            id="venta-producto"
                            products={products ?? []}
                            value={field.value || undefined}
                            onChange={(productId) => field.onChange(productId)}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{pluralOf(unitLabel)}</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Lo que cuesta esta línea, antes de agregarla. */}
                    {!nothingToRegister && product && (
                      <div className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs">
                        <p className="text-muted-foreground">
                          {describeQuantity(cantidad, unitLabel)} ={" "}
                          <span className="font-medium text-foreground">${charge.toFixed(2)}</span>
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-primary">Total ${charge.toFixed(2)}</p>
                      </div>
                    )}

                    {/* Lo que la venta lleva hasta ahora, con lo que se cobra. */}
                    {lineas.length > 0 && (
                      <ul className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
                        {lineas.map((linea) => (
                          <li key={linea.clave} className="flex items-start gap-2 text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-foreground">{linea.nombre}</p>
                              <p className="text-xs text-muted-foreground">
                                {describeQuantity(linea.quantity, linea.unitLabel)}
                              </p>
                            </div>
                            <span className="shrink-0 font-mono text-sm">${linea.importe.toFixed(2)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Quitar ${linea.nombre} de la venta`}
                              onClick={() => quitarLinea(linea.clave)}
                              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                        <li className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
                          <span>Total</span>
                          <span className="font-mono text-primary">${totalDeLaVenta.toFixed(2)}</span>
                        </li>
                      </ul>
                    )}

                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={nothingToRegister || !product}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar a la venta
                      </Button>
                      <Button
                        type="button"
                        onClick={registrarVenta}
                        disabled={createSale.isPending || lineas.length === 0}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {createSale.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {lineas.length === 0
                          ? "Registrar venta"
                          : `Registrar venta · $${totalDeLaVenta.toFixed(2)}`}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* History Section */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
              <h3 className="text-xl font-bold font-display text-white mb-1">Historial Reciente</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Todo lo que entra y sale, incluidos los fiados y sus abonos.
              </p>
              
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : isError ? (
                  <DataLoadError
                    message={describeError(error, "No se pudieron cargar los movimientos.")}
                    onRetry={() => refetch()}
                    isRetrying={isFetching}
                  />
                ) : entries?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Todavía no hay nada registrado.</p>
                ) : (
                  entries?.map((entry) => {
                    const line = describeEntry(entry);
                    const detail = entry.kind === "payment" ? entry.notes : entry.reason;
                    return (
                      <div key={`${entry.kind}-${entry.id}`} className="flex items-center gap-4 p-4 rounded-xl bg-background/30 border border-white/5 hover:border-white/10 transition-colors">
                        <div className={cn("p-3 rounded-xl shrink-0", line.tone)}>{line.icon}</div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white truncate">{line.title}</h4>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                            <span>{format(new Date(entry.at), "dd MMM yyyy, HH:mm", { locale: es })}</span>
                            {line.note && <span className="rounded bg-white/5 px-1.5 py-0.5">{line.note}</span>}
                            {detail && (
                              <>
                                <span>•</span>
                                <span className="truncate">{detail}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className={cn("text-lg font-bold font-mono shrink-0", line.amountTone)}>
                          {line.amount}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
