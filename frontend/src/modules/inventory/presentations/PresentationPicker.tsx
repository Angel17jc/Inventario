import { describeQuantity, toBaseUnits, type Presentation } from "@shared/schema";
import { usePresentations } from "./presentation-queries";

interface PresentationPickerProps {
  productId: number | undefined;
  unitLabel: string;
  /** null means loose units. */
  value: number | null;
  onChange: (packId: number | null) => void;
  /** Shown underneath so the person sees what actually leaves the shelf. */
  quantity: number;
}

/**
 * Only appears once the product has a presentation. A shop that sells nothing
 * by the case should not be asked to choose between one option and itself.
 */
export function PresentationPicker({ productId, unitLabel, value, onChange, quantity }: PresentationPickerProps) {
  const presentations = usePresentations(productId);
  const options = presentations.data ?? [];

  if (!productId || options.length === 0) return null;

  const selected: Presentation | null = options.find((option) => option.id === value) ?? null;
  const baseUnits = toBaseUnits(quantity, selected);

  return (
    <div className="space-y-1.5">
      <label htmlFor="presentation" className="block text-sm font-medium">Se registra por</label>
      <select
        id="presentation"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{unitLabel} suelta</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label} ({option.units} {unitLabel})
          </option>
        ))}
      </select>
      {selected && (
        <p className="text-xs text-muted-foreground">
          {describeQuantity(quantity, selected, unitLabel)} = <span className="font-medium text-foreground">{baseUnits} {unitLabel}</span> del stock.
        </p>
      )}
    </div>
  );
}
