import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Eye, EyeOff, Loader2, Mail, ShieldCheck, Wine } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "login" | "forgot" | "reset";

const passwordRule = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;
const passwordResetPath = "/restablecer-contrasena?reset=1";

function getAuthErrorMessage(error: { message: string; status?: number }) {
  const message = error.message.toLowerCase();

  if (message.includes("redirect") || message.includes("redirect_to")) {
    return "La URL de recuperación no está autorizada en Supabase. Revisa Authentication → URL Configuration.";
  }

  if (message.includes("rate limit") || error.status === 429) {
    return "Se alcanzó el límite temporal de correos de Supabase. Espera unos minutos antes de intentarlo otra vez.";
  }

  if (message.includes("smtp") || message.includes("email")) {
    return "Supabase no pudo enviar el correo. Revisa Authentication → Emails y la configuración SMTP del proyecto.";
  }

  return "No fue posible completar la solicitud. Verifica los datos e inténtalo nuevamente.";
}

export default function Login() {
  const [location, setLocation] = useLocation();
  const { isPasswordRecovery, completePasswordRecovery } = useAuth();
  const mode: Mode = isPasswordRecovery || window.location.search.includes("reset=1")
    ? "reset"
    : location === "/recuperar-acceso"
      ? "forgot"
      : "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function changeRoute(path: string) {
    setError(null);
    setMessage(null);
    setLocation(path);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === "reset" && (!passwordRule.test(password) || password !== confirmation)) {
      setError("Usa al menos 10 caracteres, una letra, un número y confirma la misma contraseña.");
      return;
    }

    setIsSubmitting(true);
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : mode === "forgot"
        ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${passwordResetPath}` })
        : await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (result.error) {
      console.error("Authentication request failed", { message: result.error.message, status: result.error.status });
      setError(getAuthErrorMessage(result.error));
      return;
    }

    if (mode === "login") {
      setLocation("/panel", { replace: true });
      return;
    }

    if (mode === "forgot") {
      setMessage("Enviaremos un correo con un enlace seguro para recuperar tu contraseña. Revisa también la carpeta de spam.");
      return;
    }

    completePasswordRecovery();
    await supabase.auth.signOut();
    setLocation("/iniciar-sesion", { replace: true });
  }

  const isReset = mode === "reset";

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
            {isReset ? <ShieldCheck /> : mode === "forgot" ? <Mail /> : <Wine />}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isReset ? "Nueva contraseña" : mode === "forgot" ? "Recuperar acceso" : "Licorería Manager"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isReset ? "Crea una contraseña segura para tu cuenta." : mode === "forgot" ? "Te enviaremos un enlace de recuperación a tu correo." : "Inicia sesión para continuar"}
          </p>
        </div>

        {!isReset && <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@empresa.com" required autoComplete="email" />}
        {mode !== "forgot" && (
          <div className="relative">
            <Input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isReset ? "Nueva contraseña" : "Contraseña"} required autoComplete={isReset ? "new-password" : "current-password"} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-muted-foreground" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        )}
        {isReset && (
          <>
            <div className="relative">
              <Input type={showConfirmation ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Confirmar nueva contraseña" required autoComplete="new-password" />
              <button type="button" onClick={() => setShowConfirmation(!showConfirmation)} className="absolute right-3 top-2.5 text-muted-foreground" aria-label={showConfirmation ? "Ocultar confirmación" : "Mostrar confirmación"}>
                {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Mínimo 10 caracteres, con una letra y un número.</p>
          </>
        )}

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {message && <p className="flex gap-2 text-sm text-green-400"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</p>}

        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "login" ? "Ingresar" : mode === "forgot" ? "Enviar correo de recuperación" : "Guardar nueva contraseña"}
        </Button>
        {mode === "login" && <button type="button" onClick={() => changeRoute("/recuperar-acceso")} className="w-full text-sm text-primary">¿Olvidaste tu contraseña?</button>}
        {mode === "forgot" && <button type="button" onClick={() => changeRoute("/iniciar-sesion")} className="w-full text-sm text-primary">Volver a iniciar sesión</button>}
      </form>
    </main>
  );
}
