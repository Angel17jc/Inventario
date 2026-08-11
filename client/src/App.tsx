import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Movements from "@/pages/Movements";
import Categories from "@/pages/Categories";
import Suppliers from "@/pages/Suppliers";
import Credits from "@/pages/Credits";
import Platform from "@/pages/Platform";
import Login from "@/pages/Login";
import { AuthProvider, useAuth } from "@/lib/auth";

function ProtectedRouter() {
  const { session, role, activeOrganization, isLoading, isOrganizationsLoading } = useAuth();
  if (isLoading || isOrganizationsLoading) return <div className="min-h-screen bg-background" />;
  if (!session || !role || window.location.search.includes("reset=1")) return <Login />;
  if (!activeOrganization) return <main className="grid min-h-screen place-items-center bg-background p-6 text-center text-muted-foreground">No tienes una empresa activa asignada.</main>;
  return <Router />;
}

function Router() {
  const { role } = useAuth();
  return (
    <Switch>
      <Route path="/panel" component={Dashboard} />
      <Route path="/inventario" component={Inventory} />
      <Route path="/movimientos" component={Movements} />
      <Route path="/categorias" component={Categories} />
      <Route path="/proveedores" component={Suppliers} />
      <Route path="/fiados" component={Credits} />
      {role === "platform_admin" && <Route path="/clientes" component={Platform} />}

      <Route path="/"><Redirect to="/panel" /></Route>
      <Route path="/inventory"><Redirect to="/inventario" /></Route>
      <Route path="/movements"><Redirect to="/movimientos" /></Route>
      <Route path="/categories"><Redirect to="/categorias" /></Route>
      <Route path="/suppliers"><Redirect to="/proveedores" /></Route>
      <Route path="/credits"><Redirect to="/fiados" /></Route>
      {role === "platform_admin" && <Route path="/platform"><Redirect to="/clientes" /></Route>}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <ProtectedRouter />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
