import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Store } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { describeError } from "@/lib/api-errors";
import { DataLoadError } from "@/components/ui/data-load-error";
import { createOrganization, listClients, setClientStatus, type PlatformClient } from "./platform-api";

const emptyForm = { name: "", slug: "", ownerEmail: "", ownerPassword: "" };

export default function Platform() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const clientsKey = ["/api/platform/organizations"] as const;
  const clients = useQuery({ queryKey: clientsKey, queryFn: listClients });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PlatformClient["status"] }) => setClientStatus(id, status),
    onSuccess: (_result, { status }) => {
      void queryClient.invalidateQueries({ queryKey: clientsKey });
      toast({
        title: status === "suspended" ? "Cliente suspendido" : "Cliente reactivado",
        description: status === "suspended"
          ? "Su personal ya no puede entrar hasta que lo reactives."
          : "Su personal puede volver a entrar.",
      });
    },
    onError: (error) => toast({
      title: "No se pudo cambiar el estado",
      description: describeError(error, "Vuelve a intentarlo en unos momentos."),
      variant: "destructive",
    }),
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const body = await createOrganization(form);
      setForm(emptyForm);
      void queryClient.invalidateQueries({ queryKey: clientsKey });
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

          <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div>
              <h2 className="text-xl font-semibold text-white">Licorerías cliente</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Suspender una corta el acceso de su personal sin borrar nada.
              </p>
            </div>

            {clients.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : clients.isError ? (
              <DataLoadError
                message={describeError(clients.error, "No se pudo cargar la lista de clientes.")}
                onRetry={() => void clients.refetch()}
                isRetrying={clients.isFetching}
              />
            ) : clients.data?.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Todavía no has creado ninguna licorería.</p>
            ) : (
              <ul className="divide-y divide-border">
                {clients.data?.map((client) => (
                  <li key={client.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Store className="h-4 w-4" />
                    </span>
                    <div className="min-w-48 flex-1">
                      <p className="font-medium text-foreground">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.ownerEmail ?? "Sin propietario asignado"}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      client.status === "active" ? "bg-green-500/15 text-green-400" : "bg-destructive/15 text-destructive"
                    }`}>
                      {client.status === "active" ? "Activa" : "Suspendida"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={changeStatus.isPending}
                      onClick={() => changeStatus.mutate({
                        id: client.id,
                        status: client.status === "active" ? "suspended" : "active",
                      })}
                    >
                      {client.status === "active" ? "Suspender" : "Reactivar"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
