import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { priceOf, type Presentation } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { describeError } from "@/lib/api-errors";
import { useCreatePresentation, useDeletePresentation, usePresentations } from "./presentation-queries";

interface PresentationsManagerProps {
  productId: number;
  unitLabel: string;
  /** Used to show what a presentation charges when it has no price of its own. */
  sellingPrice: number;
}

const emptyDraft = { label: "", units: "", price: "" };

/**
 * The presentations of one product, managed where the product is edited.
 * A shop that sells whisky by the case of 6 and of 12 adds two rows here;
 * one that sells only loose bottles adds none and never sees a picker.
 */
export function PresentationsManager({ productId, unitLabel, sellingPrice }: PresentationsManagerProps) {
  const { data, isLoading, isError, error } = usePresentations(productId);
  const createPresentation = useCreatePresentation(productId);
  const deletePresentation = useDeletePresentation(productId);
  const [draft, setDraft] = useState(emptyDraft);

  const presentations = data ?? [];
  const units = Number(draft.units);
  // The unique constraint lives in the database; saying so here spares a
  // round trip and an error the person cannot act on.
  const duplicate = presentations.some((presentation) => presentation.units === units);
  const canAdd = draft.label.trim().length >= 2 && units >= 2 && !duplicate;

  function add() {
    if (!canAdd) return;
    createPresentation.mutate(
      {
        label: draft.label.trim(),
        units,
        price: draft.price.trim() === "" ? null : Number(draft.price),
      },
      { onSuccess: () => setDraft(emptyDraft) },
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Presentaciones</h4>
        <p className="text-xs text-muted-foreground">
          Cómo se vende además de por {unitLabel}: caja de 6, caja de 12. El stock se sigue contando en {unitLabel}s.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <p className="text-xs text-destructive">{describeError(error, "No se pudieron cargar las presentaciones.")}</p>
      ) : presentations.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Todavía no hay ninguna. Este producto se vende solo por {unitLabel}.
        </p>
      ) : (
        <ul className="space-y-2">
          {presentations.map((presentation: Presentation) => (
            <li key={presentation.id} className="flex items-center gap-3 rounded-lg bg-background/60 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{presentation.label}</p>
                <p className="text-xs text-muted-foreground">
                  {presentation.units} {unitLabel}s · ${priceOf(presentation, sellingPrice).toFixed(2)}
                  {presentation.price === null && " (calculado)"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Quitar ${presentation.label}`}
                disabled={deletePresentation.isPending}
                onClick={() => deletePresentation.mutate(presentation.id)}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_6rem_7rem_auto]">
        <Input
          placeholder="Caja de 12"
          value={draft.label}
          onChange={(event) => setDraft({ ...draft, label: event.target.value })}
        />
        <Input
          type="number"
          min="2"
          placeholder={unitLabel + "s"}
          value={draft.units}
          onChange={(event) => setDraft({ ...draft, units: event.target.value })}
        />
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="Precio opc."
          value={draft.price}
          onChange={(event) => setDraft({ ...draft, price: event.target.value })}
        />
        <Button type="button" onClick={add} disabled={!canAdd || createPresentation.isPending}>
          {createPresentation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="ml-1 sm:hidden">Agregar</span>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {duplicate
          ? `Ya hay una presentación de ${units} ${unitLabel}s.`
          : "Deja el precio en blanco para cobrar el precio de venta multiplicado por las unidades."}
      </p>
    </div>
  );
}
