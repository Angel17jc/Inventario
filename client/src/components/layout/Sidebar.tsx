import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, Tag, Truck, ArrowRightLeft, Wine, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Package, label: "Inventario", href: "/inventory" },
  { icon: Tag, label: "Categorías", href: "/categories" },
  { icon: Truck, label: "Proveedores", href: "/suppliers" },
  { icon: ArrowRightLeft, label: "Movimientos", href: "/movements" },
  { icon: CreditCard, label: "Fiados", href: "/credits" },
];

export function Sidebar() {
  const [location] = useLocation();

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

      {/* Footer info */}
      <div className="p-6 border-t border-border/30 bg-background/30 backdrop-blur-sm">
        <p className="text-xs text-center text-muted-foreground">© 2026 Licorería Manager</p>
      </div>
    </div>
  );
}
