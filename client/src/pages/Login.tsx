import { Button } from "@/components/ui/button";
import { Wine } from "lucide-react";
import heroImg from "@assets/hero_placeholder.jpg"; // Placeholder, handled by logic

export default function Login() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Column - Hero */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-black overflow-hidden">
        {/* Unsplash Background - elegant bar */}
        {/* elegant dark bar with bottles */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60 transition-transform duration-[20s] hover:scale-105"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2.5 rounded-xl backdrop-blur-sm border border-primary/30">
              <Wine className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-display tracking-wide text-white">Licorería Manager</h1>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-5xl font-bold font-display text-white mb-6 leading-tight">
            Gestión premium para <span className="text-primary">tu negocio</span>.
          </h2>
          <p className="text-lg text-gray-300 leading-relaxed">
            Control total de tu inventario, ventas y proveedores en una plataforma elegante y eficiente diseñada para licorerías modernas.
          </p>
        </div>

        <div className="relative z-10 text-sm text-gray-500">
          © 2024 Licorería Manager. Todos los derechos reservados.
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex flex-col justify-center items-center p-8 bg-background relative">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="lg:hidden flex flex-col items-center gap-4 mb-8">
            <div className="bg-primary/20 p-3 rounded-2xl border border-primary/30">
              <Wine className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold font-display text-white">Licorería Manager</h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold font-display text-white">Bienvenido</h2>
            <p className="text-muted-foreground">Inicia sesión para acceder a tu panel de control.</p>
          </div>

          <div className="pt-8">
            <a href="/api/login">
              <Button size="lg" className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]">
                Iniciar Sesión
              </Button>
            </a>
          </div>
          
          <p className="text-xs text-muted-foreground pt-4">
            Al continuar, aceptas nuestros términos de servicio y política de privacidad.
          </p>
        </div>
      </div>
    </div>
  );
}
