import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { pluralOf, priceOf, unitCostOf, type Presentation } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ConfirmDestructive } from "@/components/ui/confirm-destructive";
import { Input } from "@/components/ui/input";
import { describeError } from "@/lib/api-errors";
import { useCreatePresentation, useDeletePresentation, usePresentations } from "./presentation-queries";

interface PresentationsManagerProps {
  productId: number;
  unitLabel: string;
  /** Used to show what a presentation charges when it has no price of its own. */
  sellingPrice: number;
  /** Used to value the stock when a presentation has no cost of its own. */
  costPrice: number;
}

const emptyDraft = { label: "", units: "", cost: "", price: "" };

/**
 * The presentations of one product, managed where the product is edited.
 * A shop that sells whisky by the case of 6, of 12 and of 24 adds three rows
 * here; one that sells only loose bottles adds none and never sees a picker.
 *
 * Cost and price are for the whole case, which is how they appear on the
 * invoice and on the shelf. What one unit works out at is shown, not asked for.
 */
export function PresentationsManager({ productId, unitLabel, sellingPrice, costPrice }: PresentationsManagerProps) {
  const { data, isLoading, isError, error } = usePresentations(productId);
  const createPresentation = useCreatePresentation(productId);
  const deletePresentation = useDeletePresentation(productId);
  const [draft, setDraft] = useState(emptyDraft);
  const [toRemove, setToRemove] = useState<Presentation | null>(null);

  const presentations = data ?? [];
  const units = Number(draft.units);
  // The unique constraint lives in the database; saying so here spares a
  // round trip and an error the person cannot act on.
  const duplicate = presentations.some((presentation) => presentation.units === units);
  const canAdd = draft.label.trim().length >= 2 && units >= 2 && !duplicate;

  const optional = (value: string) => (value.trim() === "" ? null : Number(value));

  function add() {
    if (!canAdd) return;
    createPresentation.mutate(
      {
        label: draft.label.trim(),
        units,
        cost: optional(draft.cost),
        price: optional(draft.price),
      },
      { onSuccess: () => setDraft(emptyDraft) },
    );
  }

  function describeCost(presentation: Presentation) {
    const perUnit = unitCostOf(presentation, costPrice).toFixed(2);
    if (presentation.cost === null) return `Sin costo de caja · se valora a $${perUnit} por ${unitLabel}`;
    return `Cuesta $${Number(presentation.cost).toFixed(2)} · $${perUnit} por ${unitLabel}`;
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Presentaciones</h4>
        <p className="text-xs text-muted-foreground">
          Cómo se compra y se vende además de por {unitLabel}: caja de 6, de 12, de 24.
          El costo y el precio son de la caja entera. El stock se sigue contando en {pluralOf(unitLabel)}.
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{presentation.label}</p>
                <p className="text-xs text-muted-foreground">
                  {presentation.units} {pluralOf(unitLabel)} · vende ${priceOf(presentation, sellingPrice).toFixed(2)}
                  {presentation.price === null && " (calculado)"}
                </p>
                <p className="text-xs text-muted-foreground">{describeCost(presentation)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Quitar ${presentation.label}`}
                disabled={deletePresentation.isPending}
                onClick={() => setToRemove(presentation)}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_5rem_6rem_6rem_auto]">
        <label className="col-span-2 space-y-1 sm:col-span-1">
          <span className="text-xs text-muted-foreground">Nombre</span>
          <Input
            placeholder="Caja de 12"
            value={draft.label}
            onChange={(event) => setDraft({ ...draft, label: event.target.value })}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">{pluralOf(unitLabel)}</span>
          <Input
            type="number"
            min="2"
            placeholder="12"
            value={draft.units}
            onChange={(event) => setDraft({ ...draft, units: event.target.value })}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Costo caja</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="17.00"
            value={draft.cost}
            onChange={(event) => setDraft({ ...draft, cost: event.target.value })}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Precio caja</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="24.00"
            value={draft.price}
            onChange={(event) => setDraft({ ...draft, price: event.target.value })}
          />
        </label>
        <Button
          type="button"
          onClick={add}
          // The word next to the icon is hidden from sm up, so on a desktop
          // this is an icon and nothing else.
          aria-label="Agregar presentación"
          disabled={!canAdd || createPresentation.isPending}
          className="col-span-2 sm:col-span-1 sm:self-end"
        >
          {createPresentation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="ml-1 sm:hidden">Agregar</span>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {duplicate
          ? `Ya hay una presentación de ${units} ${pluralOf(unitLabel)}.`
          : `Costo y precio son opcionales. Sin precio se cobra el precio por ${unitLabel} multiplicado por las unidades.`}
      </p>

      <ConfirmDestructive
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
        title={`¿Quitar «${toRemove?.label ?? ""}»?`}
        description={`Las ventas y entradas ya registradas con esta presentación siguen ahí y el stock no cambia, pero dejarán de decir que eran cajas de ${toRemove?.units ?? ""}: quedarán solo como ${pluralOf(unitLabel)}. No se puede deshacer.`}
        confirmLabel="Quitar"
        onConfirm={() => { if (toRemove) deletePresentation.mutate(toRemove.id); setToRemove(null); }}
      />
    </div>
  );
}
