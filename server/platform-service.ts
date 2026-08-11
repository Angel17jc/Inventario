import { supabase } from "./db";

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
}

export interface CreateOrganizationUserInput {
  organizationId: string;
  email: string;
  password: string;
  role: "manager" | "cashier";
}

function normalizeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class PlatformService {
  async createOrganizationWithOwner(input: CreateOrganizationInput) {
    const name = input.name.trim();
    const slug = normalizeSlug(input.slug || name);
    if (!slug) throw new Error("Organization slug is required");

    const { data: organization, error: organizationError } = await (supabase as any)
      .from("organizations")
      .insert({ name, slug, status: "active" })
      .select("id, name, slug, status")
      .single();
    if (organizationError) throw organizationError;

    let userId: string | undefined;
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: input.ownerEmail.trim().toLowerCase(),
        password: input.ownerPassword,
        email_confirm: true,
      });
      if (error || !data.user) throw error ?? new Error("Could not create owner account");
      userId = data.user.id;

      const { error: membershipError } = await (supabase as any)
        .from("organization_memberships")
        .insert({ organization_id: organization.id, user_id: userId, role: "owner", status: "active" });
      if (membershipError) throw membershipError;

      return { organization, owner: { id: userId, email: data.user.email } };
    } catch (error) {
      // Supabase Auth and the application database cannot share one transaction.
      // Compensate in reverse order to avoid incomplete client accounts.
      if (userId) await supabase.auth.admin.deleteUser(userId).catch(() => undefined);
      await (supabase as any).from("organizations").delete().eq("id", organization.id);
      throw error;
    }
  }

  async createOrganizationUser(input: CreateOrganizationUserInput) {
    const { data: organization, error: organizationError } = await (supabase as any)
      .from("organizations")
      .select("id, status")
      .eq("id", input.organizationId)
      .maybeSingle();
    if (organizationError) throw organizationError;
    if (!organization || organization.status !== "active") throw new Error("Organization is not active");

    let userId: string | undefined;
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        email_confirm: true,
      });
      if (error || !data.user) throw error ?? new Error("Could not create user account");
      userId = data.user.id;

      const { error: membershipError } = await (supabase as any)
        .from("organization_memberships")
        .insert({ organization_id: input.organizationId, user_id: userId, role: input.role, status: "active" });
      if (membershipError) throw membershipError;

      return { id: userId, email: data.user.email, role: input.role };
    } catch (error) {
      if (userId) await supabase.auth.admin.deleteUser(userId).catch(() => undefined);
      throw error;
    }
  }
}

export const platformService = new PlatformService();
