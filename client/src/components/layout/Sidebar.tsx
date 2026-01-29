import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, Tag, Truck, ArrowRightLeft, LogOut, Wine } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Package, label: "Inventario", href: "/inventory" },
  { icon: Tag, label: "Categorías", href: "/categories" },
  { icon: Truck, label: "Proveedores", href: "/suppliers" },
  { icon: ArrowRightLeft, label: "Movimientos", href: "/movements" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();

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

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
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

      {/* User & Logout */}
      <div className="p-4 border-t border-border/30 bg-background/30 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-amber-600 flex items-center justify-center text-primary-foreground font-bold shadow-lg">
            {user?.firstName?.charAt(0) || "A"}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate text-white">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-all duration-200 text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}
