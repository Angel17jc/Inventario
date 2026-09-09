import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, Tag, Truck, ArrowRightLeft, Wine, CreditCard, Building2, LogOut, Settings, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/panel" },
  { icon: Package, label: "Inventario", href: "/inventario" },
  { icon: Tag, label: "Categorías", href: "/categorias" },
  { icon: Truck, label: "Proveedores", href: "/proveedores" },
  { icon: ArrowRightLeft, label: "Movimientos", href: "/movimientos" },
  { icon: CreditCard, label: "Fiados", href: "/fiados" },
];

// Changing the shop's own identity belongs to whoever owns it.
const ownerItem = { icon: Settings, label: "Mi licorería", href: "/mi-licoreria" };

/**
 * On a phone the panel is a drawer. It used to be a fixed 256px column at every
 * width, which on a 360px screen left the app with a third of the room and no
 * way to get the column out of the way.
 *
 * The trigger sits at the bottom left, in reach of a thumb and clear of the
 * heading every screen puts at the top.
 */
export function Sidebar() {
  const [location] = useLocation();
  const [abierto, setAbierto] = useState(false);

  // Navegar cierra el cajón: al volver la pantalla ya cambió detrás.
  useEffect(() => setAbierto(false), [location]);

  // Escape es lo que espera cualquiera con un panel encima del contenido.
  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (evento: KeyboardEvent) => { if (evento.key === "Escape") setAbierto(false); };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierto]);

  return (
    <>
      {/* Ancho de escritorio: la columna de siempre. */}
      <div className="hidden md:flex sticky top-0 h-screen w-64 shrink-0 flex-col border-r border-border/50 bg-card text-foreground shadow-2xl">
        <PanelLateral location={location} onNavegar={() => setAbierto(false)} />
      </div>

      {/* Móvil: disparador y cajón. */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir el menú"
        aria-expanded={abierto}
        className="md:hidden fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="h-5 w-5" />
      </button>

      {abierto && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Cerrar el menú"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border/50 bg-card text-foreground shadow-2xl">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar el menú"
              className="absolute right-3 top-3 z-10 rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
            </button>
            <PanelLateral location={location} onNavegar={() => setAbierto(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function PanelLateral({ location, onNavegar }: { location: string; onNavegar: () => void }) {
  const { activeOrganization, organizations, setActiveOrganization, role, signOut, user } = useAuth();
  const isPlatformAdmin = role === "platform_admin";
  // The shop screens belong to whoever has a shop, not to a platform role.
  const hasShop = Boolean(activeOrganization);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-8 border-b border-border/30">
        {activeOrganization?.logoUrl ? (
          <img
            src={activeOrganization.logoUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-border"
          />
        ) : (
          <div className="shrink-0 rounded-xl bg-primary/20 p-2 ring-1 ring-primary/50">
            <Wine className="h-8 w-8 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          {activeOrganization ? (
            // The shop's own name where the product's used to be: the person
            // working here cares which till they are standing at.
            <h1 className="truncate font-display text-lg font-bold tracking-wide text-white" title={activeOrganization.name}>
              {activeOrganization.name}
            </h1>
          ) : (
            <h1 className="font-display text-xl font-bold tracking-wide text-white">Licorería</h1>
          )}
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {activeOrganization ? "Licorería Manager" : "Manager"}
          </p>
        </div>
      </div>

      {organizations.length > 1 && (
        <div className="px-4 pt-4">
          <label className="sr-only" htmlFor="organization-selector">Empresa activa</label>
          <select
            id="organization-selector"
            value={activeOrganization?.id ?? ""}
            onChange={(event) => setActiveOrganization(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {isPlatformAdmin && (
          <Link href="/clientes" onClick={onNavegar}><button className={cn("w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all", location === "/clientes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-white")}><Building2 className="w-5 h-5" /><span className="font-medium text-sm">Clientes</span></button></Link>
        )}
        {hasShop && [...menuItems, ...(activeOrganization?.role === "owner" ? [ownerItem] : [])].map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} onClick={onNavegar}>
              <button
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary-foreground")} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </nav>

      {/* Who is signed in, and where */}
      <div className="space-y-3 border-t border-border/30 bg-background/30 p-4 backdrop-blur-sm">
        <div className="rounded-xl bg-white/5 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {hasShop ? "Conectado como" : "Sesión de"}
          </p>
          <p className="truncate font-semibold text-white" title={user?.email ?? ""}>
            {hasShop ? user?.email : "Administración de plataforma"}
          </p>
          {!hasShop && (
            <p className="truncate text-[11px] text-muted-foreground" title={user?.email ?? ""}>
              {user?.email}
            </p>
          )}
        </div>

        <button
          onClick={() => void signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>

        <p className="text-center text-[11px] text-muted-foreground">© 2026 Licorería Manager</p>
      </div>
    </div>
  );
}
