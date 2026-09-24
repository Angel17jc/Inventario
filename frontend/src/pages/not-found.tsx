import { Link } from "wouter";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * An address the router does not know: an old bookmark, a mistyped path, or a
 * section this account's role does not have. The way back is the panel, which
 * every signed-in role can open.
 */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Compass className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">No encontramos esta página</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            La dirección no existe o tu cuenta no tiene acceso a esta sección.
          </p>
        </div>
        <Button asChild>
          <Link href="/panel">Volver al panel</Link>
        </Button>
      </div>
    </main>
  );
}
