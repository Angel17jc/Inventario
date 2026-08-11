import { useState, type FormEvent } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function Account() {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 12) return toast({ title: "Error", description: "La contraseña debe tener al menos 12 caracteres", variant: "destructive" });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast({ title: "Error", description: "No fue posible cambiar la contraseña", variant: "destructive" });
    setPassword("");
    toast({ title: "Contraseña actualizada", description: "Tu nueva contraseña ya está activa." });
  }
  return <div className="flex min-h-screen bg-background"><Sidebar /><main className="flex-1 p-8"><form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-card p-6"><h1 className="text-2xl font-bold text-white">Mi contraseña</h1><Input type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nueva contraseña" required /><Button type="submit">Cambiar contraseña</Button></form></main></div>;
}
