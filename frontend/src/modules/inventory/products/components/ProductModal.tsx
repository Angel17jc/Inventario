import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertProductSchema } from "@shared/schema";
import { useCreateProduct, useUpdateProduct } from "@/modules/inventory/products/product-queries";
import { useCategories } from "@/modules/catalog/categories/category-queries";
import { useSuppliers } from "@/modules/catalog/suppliers/supplier-queries";
import { discardDraft, useDraft } from "@/lib/use-draft";
import { PresentationsManager } from "@/modules/inventory/presentations/PresentationsManager";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// Extend schema for form validation to handle string inputs for numbers
const formSchema = insertProductSchema.extend({
  quantity: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  categoryId: z.coerce.number().optional(),
  supplierId: z.coerce.number().optional(),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any; // If provided, edit mode
}

export function ProductModal({ open, onOpenChange, product }: ProductModalProps) {
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const isPending = createProduct.isPending || updateProduct.isPending;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sku: "",
      quantity: 0,
      costPrice: 0,
      sellingPrice: 0,
      imageUrl: "",
      unitLabel: "unidad",
    },
  });

  // A product needs an id before it can have presentations. Rather than send
  // the person away to reopen what they just created, the modal stays on the
  // product and turns into its editor.
  const [createdId, setCreatedId] = useState<number | null>(null);
  const productId = product?.id ?? createdId ?? undefined;

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku || "",
        quantity: product.quantity,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
        imageUrl: product.imageUrl || "",
        unitLabel: product.unitLabel || "unidad",
        categoryId: product.categoryId,
        supplierId: product.supplierId,
      });
    } else {
      form.reset({
        name: "",
        sku: "",
        quantity: 0,
        costPrice: 0,
        sellingPrice: 0,
        imageUrl: "",
        unitLabel: "unidad",
      });
    }
  }, [product, form]);

  // Reopening the modal must not offer the presentations of the product
  // created the time before.
  useEffect(() => {
    if (!open) setCreatedId(null);
  }, [open]);

  const draftKey = open ? `product:${product?.id ?? "new"}` : null;
  const restoreDraft = useCallback((draft: ProductFormValues) => form.reset(draft), [form]);
  useDraft(draftKey, form.watch(), restoreDraft);

  // Closing on purpose abandons the draft; the tab going away does not.
  function closeAndDiscard() {
    if (draftKey) discardDraft(draftKey);
    onOpenChange(false);
  }

  const isEditing = productId !== undefined;

  function onSubmit(data: ProductFormValues) {
    // Convert numeric decimal values to strings as expected by schema
    const submitData = {
      ...data,
      costPrice: String(data.costPrice),
      sellingPrice: String(data.sellingPrice),
    };

    if (productId !== undefined) {
      updateProduct.mutate({ id: productId, ...submitData }, {
        onSuccess: closeAndDiscard,
      });
    } else {
      createProduct.mutate(submitData, {
        onSuccess: (created) => {
          if (draftKey) discardDraft(draftKey);
          setCreatedId(created.id);
        },
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : closeAndDiscard())}>
      <DialogContent className="sm:max-w-2xl bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Producto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Whisky Black Label" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (Código)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. WBL-750" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers?.map((sup) => (
                          <SelectItem key={sup.id} value={String(sup.id)}>{sup.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo por unidad</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio por unidad</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Actual</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la unidad</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. botella" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            {productId === undefined ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                Las presentaciones (caja de 6, caja de 12) se agregan en cuanto guardes el producto.
              </p>
            ) : (
              <PresentationsManager
                productId={productId}
                unitLabel={form.watch("unitLabel") || "unidad"}
                sellingPrice={Number(form.watch("sellingPrice")) || 0}
                costPrice={Number(form.watch("costPrice")) || 0}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeAndDiscard}>
                {createdId !== null ? "Listo" : "Cancelar"}
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Guardar Cambios" : "Crear Producto"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
