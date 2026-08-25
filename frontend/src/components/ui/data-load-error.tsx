import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataLoadErrorProps {
  /** Already worded for a person: build it with describeError(). */
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

/**
 * Shown in place of a list that could not be loaded. Without it a failed read
 * looks exactly like a business with no records yet, which is the more
 * dangerous of the two readings: nobody goes looking for data they believe
 * isn't there.
 */
export function DataLoadError({ message, onRetry, isRetrying = false }: DataLoadErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-destructive/15 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div className="space-y-1">
        <p className="font-medium text-foreground">No pudimos cargar esta información</p>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
        <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
        {isRetrying ? "Reintentando…" : "Reintentar"}
      </Button>
    </div>
  );
}
