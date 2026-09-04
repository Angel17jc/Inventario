import { useId, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Check, Eye, EyeOff, Loader2, MailWarning, ShieldCheck, X } from "lucide-react";
import { accountPasswordSchema, passwordRules } from "@shared/schema";
import { recoveryLinkError, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// The same definitions the API validates against, so the live feedback below
// can never drift from what the server will accept.
const rules = passwordRules;

function PasswordField({
  value,
  onChange,
  label,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  autoComplete: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  // The toggle cannot live inside the label: its text would be folded into the
  // field's accessible name, which screen readers then announce as
  // "Nueva contraseña Mostrar nueva contraseña".
  const id = useId();

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <Input
          id={id}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="pr-11"
          required
        />
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={isVisible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Requirement({ isMet, children }: { isMet: boolean; children: string }) {
  return (
    <li className={`flex items-center gap-2 transition-colors ${isMet ? "text-green-400" : "text-muted-foreground"}`}>
      {isMet ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0 opacity-40" />}
      {children}
    </li>
  );
}

function ExpiredLink({ onRequestNew }: { onRequestNew: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/15 text-destructive">
          <MailWarning />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Este enlace ya no sirve</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {recoveryLinkError === "expired"
              ? "Los enlaces de recuperación caducan y solo se pueden usar una vez. El tuyo ya fue abierto o pasó su tiempo de validez."
              : "El enlace no es válido. Puede que se haya cortado al copiarlo o que ya se haya usado."}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pide uno nuevo y ábrelo cuanto antes, desde el mismo dispositivo donde vas a entrar.
          </p>
        </div>
        <Button className="w-full" type="button" onClick={onRequestNew}>
          Pedir un enlace nuevo
        </Button>
      </div>
    </main>
  );
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { completePasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checks = useMemo(() => rules.map((rule) => rule.isMet(password)), [password]);
  const matches = password.length > 0 && password === confirmation;
  const canSubmit = checks.every(Boolean) && matches && !isSubmitting;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    const rejection = accountPasswordSchema.safeParse(password);
    if (!rejection.success) {
      setError(rejection.error.issues[0]?.message ?? "Contraseña inválida.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    // Supabase applies the change against this session. It is the only party
    // that knows the session came from a recovery link, so it is the only one
    // that can allow the change here and demand re-authentication anywhere
    // else. Doing it through the server's admin key skipped that distinction.
    const { error: failure } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (failure) {
      setError(
        failure.status === 401 || failure.status === 403
          ? "El enlace de recuperación caducó o ya fue utilizado. Solicita uno nuevo."
          : failure.message || "No fue posible guardar la contraseña. Inténtalo nuevamente.",
      );
      return;
    }

    completePasswordRecovery();
    await supabase.auth.signOut();
    setLocation("/iniciar-sesion", { replace: true });
  }

  if (recoveryLinkError) {
    // Clearing the flag matters: the router keeps rendering this screen while
    // a recovery is considered in progress.
    return (
      <ExpiredLink
        onRequestNew={() => {
          completePasswordRecovery();
          setLocation("/recuperar-acceso", { replace: true });
        }}
      />
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
            <ShieldCheck />
          </div>
          <h1 className="text-2xl font-bold text-white">Nueva contraseña</h1>
          <p className="text-sm text-muted-foreground">Crea una contraseña segura para tu cuenta.</p>
        </div>

        <div className="space-y-4">
          <PasswordField label="Nueva contraseña" value={password} onChange={setPassword} autoComplete="new-password" />
          <PasswordField label="Confirmar contraseña" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
        </div>

        <ul className="space-y-1.5 text-xs" aria-live="polite">
          {rules.map((rule, index) => (
            <Requirement key={rule.label} isMet={checks[index]}>
              {rule.label}
            </Requirement>
          ))}
          <Requirement isMet={matches}>Las dos contraseñas coinciden</Requirement>
        </ul>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <Button className="w-full" type="submit" disabled={!canSubmit}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar nueva contraseña
        </Button>
      </form>
    </main>
  );
}
