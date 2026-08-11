import { Switch, Route } from "wouter";
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
import Account from "@/pages/Account";
import Login from "@/pages/Login";
import { AuthProvider, useAuth } from "@/lib/auth";

function ProtectedRouter() {
  const { session, role, activeOrganization, isLoading, isOrganizationsLoading } = useAuth();
  if (isLoading || isOrganizationsLoading) return <div className="min-h-screen bg-background" />;
  if (!session || !role) return <Login />;
  if (!activeOrganization) return <main className="grid min-h-screen place-items-center bg-background p-6 text-center text-muted-foreground">No tienes una empresa activa asignada.</main>;
  return <Router />;
}

function Router() {
  const { role } = useAuth();
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/movements" component={Movements} />
      <Route path="/categories" component={Categories} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/credits" component={Credits} />
      <Route path="/account" component={Account} />
      {role === "platform_admin" && <Route path="/platform" component={Platform} />}
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
