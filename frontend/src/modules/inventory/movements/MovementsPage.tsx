import { Sidebar } from "@/components/layout/Sidebar";
import { PresentationPicker } from "@/modules/inventory/presentations/PresentationPicker";
import { usePresentations } from "@/modules/inventory/presentations/presentation-queries";
import { useToast } from "@/hooks/use-toast";
import { chargeFor, describeQuantity, describeSale, pluralOf, toBaseUnits, type LedgerEntry } from "@shared/schema";
import { useCreateMovement, useLedger } from "@/modules/inventory/movements/movement-queries";
import { useProducts } from "@/modules/inventory/products/product-queries";
import { Button } from "@/components/ui/button";
import { DataLoadError } from "@/components/ui/data-load-error";
import { describeError } from "@/lib/api-errors";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMovementSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDown, ArrowUp, HandCoins, Loader2, RefreshCw } from "lucide-react";
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
  const figure = describeSale(entry.enteredQuantity ?? 0, entry.looseQuantity ?? 0, entry.pack, unitLabel);
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
    // The chip only earns its place when it says something the figure does
    // not: "1 × Caja de 12 + 6 botellas" against the 18 that left the shelf.
    note: entry.pack || entry.looseQuantity ? figure : null,
  };
}

// A sale is whole cases plus loose units: one case and six beers is one sale,
// not two. Either side may be zero, which the submit button enforces.
const formSchema = insertMovementSchema.extend({
  packId: z.coerce.number().int().positive().nullable().optional(),
  quantity: z.coerce.number().min(0),
  looseQuantity: z.coerce.number().min(0),
  productId: z.coerce.number().min(1, "Selecciona un producto"),
  // Stock only ever leaves from here. Buying is recorded in the inventory,
  // where the shop writes down what it now has on the shelf.
  type: z.literal("OUT"),
});

const emptySale = { type: "OUT", quantity: 0, looseQuantity: 1, packId: null } as const;

type MovementFormValues = z.infer<typeof formSchema>;

export default function Movements() {
  const { data: entries, isLoading, isError, error, refetch, isFetching } = useLedger();
  const { data: products } = useProducts();
  const createMovement = useCreateMovement();
  const { toast } = useToast();

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...emptySale },
  });

  const selectedProductId = Number(form.watch("productId")) || undefined;
  const presentations = usePresentations(selectedProductId).data ?? [];
  const product = products?.find((candidate) => candidate.id === selectedProductId);
  const unitLabel = product?.unitLabel ?? "unidad";

  const packId = form.watch("packId") ?? null;
  const presentation = presentations.find((candidate) => candidate.id === packId) ?? null;
  const packQuantity = presentation ? Number(form.watch("quantity")) || 0 : 0;
  const looseQuantity = Number(form.watch("looseQuantity")) || 0;
  const leaving = toBaseUnits(packQuantity, presentation) + looseQuantity;
  const charge = chargeFor(packQuantity, looseQuantity, presentation, product?.sellingPrice ?? 0);
  const nothingToRegister = leaving <= 0;

  function onSubmit(data: MovementFormValues) {
    const remaining = (product?.quantity ?? 0) - leaving;

    // The same figure the charge above was worked out from. Without a
    // presentation it is zero, whatever the field held before the presentation
    // was cleared, and what is shown and what is sent cannot disagree.
    createMovement.mutate({ ...data, quantity: packQuantity }, {
      onSuccess: () => {
        // Registering the sale is never refused, so the person is told what it
        // left behind rather than being stopped beforehand.
        if (remaining <= 0 && product) {
          toast({
            title: remaining < 0 ? `${product.name} quedó en negativo` : `${product.name} se agotó`,
            description: remaining < 0
              ? `El registro dice ${describeQuantity(remaining, null, unitLabel)}: se vendió más de lo que había contado. Corrige el stock en Inventario cuando puedas.`
              : "No queda nada en el registro. Repón antes de la próxima venta.",
            variant: "destructive",
          });
        }
        form.reset({ ...emptySale });
      },
    });
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
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
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Producto</FormLabel>
                          <Select onValueChange={(val) => field.onChange(Number(val))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Buscar producto..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products?.map((prod) => (
                                <SelectItem key={prod.id} value={String(prod.id)}>
                                  {prod.name} (Stock: {prod.quantity})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <PresentationPicker
                      productId={selectedProductId}
                      unitLabel={unitLabel}
                      value={packId}
                      onChange={(next) => {
                        form.setValue("packId", next);
                        // Clearing the presentation leaves no cases to count.
                        if (next === null) form.setValue("quantity", 0);
                      }}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      {presentation && (
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{presentation.label}</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="looseQuantity"
                        render={({ field }) => (
                          <FormItem className={presentation ? undefined : "col-span-2"}>
                            <FormLabel>{presentation ? `${pluralOf(unitLabel)} sueltas` : pluralOf(unitLabel)}</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* What the sale comes to, before it is registered: the
                        cases at the case price, the loose units at the unit
                        price, and the stock counted in base units. */}
                    {!nothingToRegister && product && (
                      <div className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs">
                        <p className="text-muted-foreground">
                          {describeSale(packQuantity, looseQuantity, presentation, unitLabel)} ={" "}
                          <span className="font-medium text-foreground">{describeQuantity(leaving, null, unitLabel)}</span> del stock
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-primary">Total ${charge.toFixed(2)}</p>
                      </div>
                    )}

                    <Button type="submit" disabled={createMovement.isPending || nothingToRegister} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-4">
                      {createMovement.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Registrar venta
                    </Button>
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
