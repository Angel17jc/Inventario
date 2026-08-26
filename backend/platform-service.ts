import { supabase } from "./db.js";

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
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
  async updateOrganizationStatus(organizationId: string, status: "active" | "suspended") {
    const { data, error } = await (supabase as any).from("organizations").update({ status }).eq("id", organizationId).select("id, name, status").single();
    if (error) throw error;
    return data;
  }


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



}

export const platformService = new PlatformService();
