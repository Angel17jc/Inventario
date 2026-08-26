import { useRef, useState, type FormEvent } from "react";
import { ImageUp, Loader2, Trash2, Wine } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { describeError } from "@/lib/api-errors";
import { LOGO_MAX_BYTES } from "@shared/schema";
import { describeUnusableLogo, removeShopLogo, renameShop, uploadShopLogo } from "./organization-api";

export default function Settings() {
  const { toast } = useToast();
  const { activeOrganization, refreshOrganizations } = useAuth();
  const [name, setName] = useState(activeOrganization?.name ?? "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const logoUrl = activeOrganization?.logoUrl ?? null;
  const nameHasChanged = name.trim() !== (activeOrganization?.name ?? "");

  async function submitName(event: FormEvent) {
    event.preventDefault();
    setIsSavingName(true);
    try {
      await renameShop(name.trim());
      await refreshOrganizations();
      toast({ title: "Nombre actualizado", description: "Así se llamará tu licorería en todo el sistema." });
    } catch (error) {
      toast({
        title: "No se pudo guardar el nombre",
        description: describeError(error, "Vuelve a intentarlo en unos momentos."),
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  }

  async function chooseLogo(file: File) {
    const problem = describeUnusableLogo(file);
    if (problem) {
      toast({ title: "Esa imagen no sirve", description: problem, variant: "destructive" });
      return;
    }

    setIsSavingLogo(true);
    try {
      await uploadShopLogo(file);
      await refreshOrganizations();
      toast({ title: "Logo actualizado", description: "Ya aparece en el menú lateral." });
    } catch (error) {
      toast({
        title: "No se pudo guardar el logo",
        description: describeError(error, "Vuelve a intentarlo en unos momentos."),
        variant: "destructive",
      });
    } finally {
      setIsSavingLogo(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function discardLogo() {
    setIsSavingLogo(true);
    try {
      await removeShopLogo();
      await refreshOrganizations();
      toast({ title: "Logo quitado", description: "Volvemos a la marca genérica." });
    } catch (error) {
      toast({
        title: "No se pudo quitar el logo",
        description: describeError(error, "Vuelve a intentarlo en unos momentos."),
        variant: "destructive",
      });
    } finally {
      setIsSavingLogo(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-2xl space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Mi licorería</h1>
            <p className="mt-2 text-muted-foreground">Cómo se llama tu negocio y con qué imagen aparece.</p>
          </div>

          <form onSubmit={submitName} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="space-y-1.5">
              <label htmlFor="shop-name" className="block text-sm font-medium">Nombre</label>
              <Input
                id="shop-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={120}
                required
              />
              <p className="text-xs text-muted-foreground">Aparece en el menú, en el panel y en tus reportes.</p>
            </div>
            <Button type="submit" disabled={isSavingName || !nameHasChanged}>
              {isSavingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar nombre
            </Button>
          </form>

          <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div>
              <h2 className="text-xl font-semibold text-white">Logo</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                PNG, JPG o WebP, hasta {LOGO_MAX_BYTES / 1024} KB. Se ve mejor cuadrado.
              </p>
            </div>

            <div className="flex items-center gap-5">
              <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-background">
                {logoUrl ? (
                  <img src={logoUrl} alt={`Logo de ${activeOrganization?.name ?? "tu licorería"}`} className="h-full w-full object-cover" />
                ) : (
                  <Wine className="h-8 w-8 text-primary" />
                )}
              </span>

              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void chooseLogo(file);
                  }}
                />
                <Button type="button" variant="outline" disabled={isSavingLogo} onClick={() => fileInput.current?.click()}>
                  {isSavingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                  {logoUrl ? "Cambiar logo" : "Subir logo"}
                </Button>
                {logoUrl && (
                  <Button type="button" variant="ghost" disabled={isSavingLogo} onClick={() => void discardLogo()}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Quitar
                  </Button>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
