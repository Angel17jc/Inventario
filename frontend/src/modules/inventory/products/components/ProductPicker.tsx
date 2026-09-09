import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PickableProduct {
  id: number;
  name: string;
  sku?: string | null;
  quantity: number;
  unitLabel?: string | null;
}

interface ProductPickerProps {
  products: PickableProduct[];
  value: number | undefined;
  onChange: (productId: number) => void;
  /** Rendered above the field. */
  label?: string;
  id?: string;
}

/**
 * Picks a product by typing part of its name or its code.
 *
 * A plain dropdown asks the person to scroll a whole catalogue while a customer
 * waits at the counter. The inventory screen has had a search box for a while;
 * this is the same thing where it matters more.
 */
export function ProductPicker({ products, value, onChange, label = "Producto", id = "product-picker" }: ProductPickerProps) {
  const [query, setQuery] = useState("");
  const selected = products.find((product) => product.id === value);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(needle) || (product.sku ?? "").toLowerCase().includes(needle),
    );
  }, [products, query]);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="search"
          className="pl-9"
          placeholder={selected ? selected.name : "Escribe el nombre o el código…"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {products.length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay productos todavía. Agrega uno en Inventario.</p>
      ) : matches.length === 0 ? (
        <p className="text-xs text-muted-foreground">Ningún producto coincide con «{query.trim()}».</p>
      ) : (
        <ul
          role="listbox"
          aria-label="Productos"
          className="max-h-52 divide-y divide-border/60 overflow-y-auto rounded-md border border-input bg-background"
        >
          {matches.map((product) => {
            const chosen = product.id === value;
            const unit = product.unitLabel ?? "unidad";
            return (
              <li key={product.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={chosen}
                  onClick={() => onChange(product.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    chosen && "bg-accent",
                  )}
                >
                  <Check className={cn("h-4 w-4 shrink-0", chosen ? "text-primary" : "invisible")} />
                  <span className="min-w-0 flex-1 truncate">{product.name}</span>
                  <span
                    className={cn(
                      "shrink-0 text-xs",
                      product.quantity <= 0 ? "font-medium text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {product.quantity <= 0 ? "agotado" : `${product.quantity} ${unit}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
