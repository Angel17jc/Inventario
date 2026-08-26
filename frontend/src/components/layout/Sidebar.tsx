import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, Tag, Truck, ArrowRightLeft, Wine, CreditCard, Building2, LogOut } from "lucide-react";
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

export function Sidebar() {
  const [location] = useLocation();
  const { activeOrganization, organizations, setActiveOrganization, role, signOut, user } = useAuth();
  const isPlatformAdmin = role === "platform_admin";
  // The shop screens belong to whoever has a shop, not to a platform role.
  const hasShop = Boolean(activeOrganization);

  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r border-border/50 text-foreground shadow-2xl sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-8 border-b border-border/30">
        <div className="bg-primary/20 p-2 rounded-xl ring-1 ring-primary/50">
          <Wine className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display tracking-wide text-white">Licorería</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Manager</p>
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
          <Link href="/clientes"><button className={cn("w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all", location === "/clientes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-white")}><Building2 className="w-5 h-5" /><span className="font-medium text-sm">Clientes</span></button></Link>
        )}
        {hasShop && menuItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
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
            {hasShop ? "Estás en" : "Sesión de"}
          </p>
          <p className="truncate font-semibold text-white" title={activeOrganization?.name ?? user?.email ?? ""}>
            {activeOrganization?.name ?? "Administración de plataforma"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground" title={user?.email ?? ""}>
            {user?.email}
          </p>
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
