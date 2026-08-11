import { useState, type FormEvent } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { authenticatedFetch } from "@/lib/auth";
import { useAuth } from "@/lib/auth";

export default function Platform() {
  const { toast } = useToast();
  const { organizations, activeOrganization } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserSubmitting, setIsUserSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", ownerEmail: "", ownerPassword: "" });
  const [userForm, setUserForm] = useState<{ organizationId: string; email: string; password: string; role: "manager" | "cashier" }>({ organizationId: activeOrganization?.id ?? "", email: "", password: "", role: "cashier" });

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

  async function submitUser(event: FormEvent) {
    event.preventDefault();
    setIsUserSubmitting(true);
    try {
      const response = await authenticatedFetch("/api/platform/organization-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "No fue posible crear el usuario");
      setUserForm({ organizationId: userForm.organizationId, email: "", password: "", role: "cashier" });
      toast({ title: "Usuario creado", description: `${body.email} fue agregado como ${body.role}.` });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No fue posible crear el usuario", variant: "destructive" });
    } finally {
      setIsUserSubmitting(false);
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
        <form onSubmit={submitUser} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div>
            <h2 className="text-xl font-semibold text-white">Agregar usuario a un cliente</h2>
            <p className="mt-1 text-sm text-muted-foreground">Crea credenciales para el personal de una licorería existente.</p>
          </div>
          <select aria-label="Empresa" value={userForm.organizationId} onChange={(event) => setUserForm({ ...userForm, organizationId: event.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
            <option value="" disabled>Selecciona una empresa</option>
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
          <Input aria-label="Correo del usuario" type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} placeholder="empleado@cliente.com" required />
          <Input aria-label="Contraseña inicial del usuario" type="password" minLength={12} value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} placeholder="Contraseña inicial (mínimo 12 caracteres)" required />
          <select aria-label="Rol" value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value as "manager" | "cashier" })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="cashier">Cajero</option>
            <option value="manager">Gerente</option>
          </select>
          <Button type="submit" disabled={isUserSubmitting || organizations.length === 0} className="w-full">{isUserSubmitting ? "Creando usuario..." : "Crear usuario"}</Button>
        </form>
      </div>
    </main>
  </div>;
}
