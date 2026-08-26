import { useState, type FormEvent } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { describeError } from "@/lib/api-errors";
import { createOrganization } from "./platform-api";

const emptyForm = { name: "", slug: "", ownerEmail: "", ownerPassword: "" };

export default function Platform() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const body = await createOrganization(form);
      setForm(emptyForm);
      toast({
        title: "Cliente creado",
        description: `Se creó ${body.organization.name} y su usuario propietario. Entrégale la contraseña de forma segura.`,
      });
    } catch (error) {
      toast({
        title: "No se pudo crear el cliente",
        description: describeError(error, "Vuelve a intentarlo en unos momentos."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-2xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-white">Administración de plataforma</h1>
            <p className="mt-2 text-muted-foreground">
              Crea una licorería cliente y el usuario propietario que la administrará.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="space-y-1.5">
              <label htmlFor="organization-name" className="block text-sm font-medium">Nombre de la licorería</label>
              <Input
                id="organization-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Licorería Central"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="organization-slug" className="block text-sm font-medium">
                Identificador <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <Input
                id="organization-slug"
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                placeholder="licoreria-central"
              />
              <p className="text-xs text-muted-foreground">Si lo dejas vacío se genera a partir del nombre.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="owner-email" className="block text-sm font-medium">Correo del propietario</label>
              <Input
                id="owner-email"
                type="email"
                value={form.ownerEmail}
                onChange={(event) => setForm({ ...form, ownerEmail: event.target.value })}
                placeholder="propietario@cliente.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="owner-password" className="block text-sm font-medium">Contraseña inicial</label>
              <Input
                id="owner-password"
                type="password"
                minLength={12}
                value={form.ownerPassword}
                onChange={(event) => setForm({ ...form, ownerPassword: event.target.value })}
                placeholder="Mínimo 12 caracteres"
                required
              />
              <p className="text-xs text-muted-foreground">
                El propietario podrá cambiarla desde «¿Olvidaste tu contraseña?».
              </p>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Creando cliente…" : "Crear cliente y propietario"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
