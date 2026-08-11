import { useState, type FormEvent } from "react";
import { Loader2, Wine } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);
    if (signInError) setError("No fue posible iniciar sesión. Verifica tus credenciales.");
  }

  return <main className="min-h-screen grid place-items-center bg-background p-6">
    <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8 shadow-2xl">
      <div className="text-center space-y-2">
        <Wine className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold text-white">Licorería Manager</h1>
        <p className="text-sm text-muted-foreground">Inicia sesión para continuar</p>
      </div>
      <Input aria-label="Correo electrónico" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@empresa.com" required autoComplete="email" />
      <Input aria-label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña" required autoComplete="current-password" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ingresar
      </Button>
    </form>
  </main>;
}
