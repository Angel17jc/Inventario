import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useProducts, useRetireProduct } from "@/modules/inventory/products/product-queries";
import { ProductModal } from "./components/ProductModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDestructive } from "@/components/ui/confirm-destructive";
import { DataLoadError } from "@/components/ui/data-load-error";
import { describeError } from "@/lib/api-errors";
import { Search, Plus, Edit2, Archive, Package } from "lucide-react";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Inventory() {
  const { data: products, isLoading, isError, error, refetch, isFetching } = useProducts();
  const retireProduct = useRetireProduct();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [retireId, setRetireId] = useState<number | null>(null);

  const filteredProducts = products?.filter((p) => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRetire = () => {
    if (retireId) {
      retireProduct.mutate(retireId);
      setRetireId(null);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold font-display text-white mb-2">Inventario</h1>
              <p className="text-muted-foreground">Gestiona tu catálogo de productos.</p>
            </div>
            <Button 
              onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre o SKU..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background/50 border-border"
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : isError ? (
              <DataLoadError
                message={describeError(error, "No se pudieron cargar los productos.")}
                onRetry={() => refetch()}
                isRetrying={isFetching}
              />
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-white font-bold">Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Precio Venta</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="w-8 h-8 opacity-50" />
                            <p>No se encontraron productos.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts?.map((product) => (
                        <TableRow key={product.id} className="hover:bg-white/5">
                          <TableCell className="font-medium">
                            <div>
                              <p className="text-white">{product.name}</p>
                              {/* Running out is the only warning the shop asked
                                  for. A negative count means more was sold than
                                  the shelf was ever recorded as holding. */}
                              {product.quantity <= 0 && (
                                <Badge variant="destructive" className="mt-1 h-auto px-1.5 py-0 text-[10px]">
                                  {product.quantity < 0 ? `Agotado · faltan ${Math.abs(product.quantity)}` : "Agotado"}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{product.category?.name || <span className="text-muted-foreground italic">Sin categoría</span>}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">{product.sku || '-'}</TableCell>
                          <TableCell className="text-right">
                            <span className={product.quantity <= 0 ? "font-bold text-red-400" : "text-white font-medium"}>
                              {product.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-400">
                            ${Number(product.sellingPrice).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Editar ${product.name}`}
                                onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                                className="hover:bg-blue-500/20 hover:text-blue-400"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Retirar ${product.name}`}
                                onClick={() => setRetireId(product.id)}
                                className="hover:bg-red-500/20 hover:text-red-400"
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </main>

      <ProductModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        product={editingProduct}
      />

      <ConfirmDestructive
        open={retireId !== null}
        onOpenChange={(open) => !open && setRetireId(null)}
        title="¿Retirar este producto?"
        description="Dejará de aparecer en el inventario y no podrás venderlo ni fiarlo. Su historial de movimientos y de fiados se conserva. Si tiene fiados sin pagar no se puede retirar."
        confirmLabel="Retirar"
        onConfirm={handleRetire}
      />
    </div>
  );
}
