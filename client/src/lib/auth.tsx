import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Role = "platform_admin" | "owner" | "manager" | "cashier";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  role?: "owner" | "manager" | "cashier";
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: Role | null;
  organizations: Organization[];
  activeOrganization: Organization | null;
  setActiveOrganization: (organizationId: string) => void;
  isOrganizationsLoading: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getRole(user: User | null): Role | null {
  if (user?.app_metadata.platform_role === "platform_admin" || user?.app_metadata.role === "admin") return "platform_admin";
  // Organization membership, not a JWT claim, authorizes tenant users.
  return user ? "cashier" : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(localStorage.getItem("activeOrganizationId"));
  const [isLoading, setIsLoading] = useState(true);
  const [isOrganizationsLoading, setIsOrganizationsLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setOrganizations([]);
      setIsOrganizationsLoading(false);
      return;
    }
    setIsOrganizationsLoading(true);
    authenticatedFetch("/api/organizations/me")
      .then(async (response) => response.ok ? response.json() : [])
      .then((data: Organization[]) => {
        const activeOrganizations = data.filter((organization) => organization.status === "active");
        const nextOrganizationId = activeOrganizationId && activeOrganizations.some((organization) => organization.id === activeOrganizationId)
          ? activeOrganizationId
          : activeOrganizations[0]?.id ?? null;

        setOrganizations(activeOrganizations);
        setActiveOrganizationId(nextOrganizationId);

        if (nextOrganizationId) {
          localStorage.setItem("activeOrganizationId", nextOrganizationId);
        } else {
          localStorage.removeItem("activeOrganizationId");
        }
      })
      .finally(() => setIsOrganizationsLoading(false));
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    role: getRole(session?.user ?? null),
    organizations,
    activeOrganization: organizations.find((organization) => organization.id === activeOrganizationId) ?? null,
    setActiveOrganization: (organizationId: string) => {
      localStorage.setItem("activeOrganizationId", organizationId);
      setActiveOrganizationId(organizationId);
      window.location.assign("/panel");
    },
    isOrganizationsLoading,
    isLoading,
    signOut: async () => {
      localStorage.removeItem("activeOrganizationId");
      await supabase.auth.signOut();
    },
  }), [session, organizations, activeOrganizationId, isLoading, isOrganizationsLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  const organizationId = localStorage.getItem("activeOrganizationId");
  if (organizationId) headers.set("X-Organization-Id", organizationId);
  return fetch(input, { ...init, headers });
}
