import { useState, type FormEvent } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { authenticatedFetch } from "@/lib/auth";

export default function Platform() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", ownerEmail: "", ownerPassword: "" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await authenticatedFetch("/api/platform/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "No fue posible crear el cliente");
      setForm({ name: "", slug: "", ownerEmail: "", ownerPassword: "" });
      toast({ title: "Cliente creado", description: `Se creó ${body.organization.name} y su usuario propietario.` });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No fue posible crear el cliente", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return <div className="flex min-h-screen bg-background text-foreground">
    <Sidebar />
    <main className="flex-1 overflow-auto p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Administración de plataforma</h1>
          <p className="mt-2 text-muted-foreground">Crea una licorería cliente y el usuario propietario que la administrará.</p>
        </div>
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-xl">
          <Input aria-label="Nombre de la empresa" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre de la licorería" required />
          <Input aria-label="Identificador de empresa" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="Identificador opcional, por ejemplo: licoreria-central" />
          <Input aria-label="Correo del propietario" type="email" value={form.ownerEmail} onChange={(event) => setForm({ ...form, ownerEmail: event.target.value })} placeholder="propietario@cliente.com" required />
          <Input aria-label="Contraseña inicial" type="password" minLength={12} value={form.ownerPassword} onChange={(event) => setForm({ ...form, ownerPassword: event.target.value })} placeholder="Contraseña inicial (mínimo 12 caracteres)" required />
          <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? "Creando cliente..." : "Crear cliente y propietario"}</Button>
        </form>
      </div>
    </main>
  </div>;
}
