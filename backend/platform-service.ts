import { supabase } from "./db.js";

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
}

/**
 * Every account's address, however many there are.
 *
 * listUsers answers one page at a time and defaults to 50. Reading only the
 * first page did not fail: the owners past it simply came back without an
 * email, so the client list would start showing blanks once the business grew
 * past fifty shops, with nothing to say why.
 */
async function allUserEmails(): Promise<Map<string, string>> {
  const emailByUserId = new Map<string, string>();
  const perPage = 200;

  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const user of data.users) emailByUserId.set(user.id, user.email ?? "");
    // A short page is the last one; a full page may still have more behind it.
    if (data.users.length < perPage) return emailByUserId;
  }
}

/**
 * Creates the shop, giving it an address nobody else is using.
 *
 * organizations.slug is unique across the whole platform, and two shops can
 * honestly want the same one: every platform administrator's own shop is
 * provisioned as "Mi Licorería" and normalises to "mi-licoreria", and two
 * clients can both be called Licorería El Sol. Without this the second one hit
 * a unique violation — and for an administrator that surfaced as a 500 from
 * /api/organizations/me, which is the response that locks everyone out.
 *
 * The number only breaks the tie, so it starts at the second shop: the first
 * one keeps the plain slug.
 */
async function insertOrganization(name: string, desiredSlug: string) {
  const base = normalizeSlug(desiredSlug || name);
  if (!base) throw new Error("Organization slug is required");

  for (let attempt = 1; attempt <= 25; attempt++) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;
    const { data, error } = await (supabase as any)
      .from("organizations")
      .insert({ name, slug, status: "active" })
      .select("id, name, slug, status")
      .single();

    if (!error) return data;
    // 23505 is the unique violation. Anything else is not ours to retry.
    if (error.code !== "23505") throw error;
  }

  throw new Error(`No free slug for "${base}" after 25 attempts`);
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
  /**
   * The client accounts, with the owner that administers each one: names and
   * status, never what they sell or are owed. A shop the administrator owns
   * itself is not a client and is left out.
   */
  async listOrganizations(administratorId: string) {
    // The generated Database type does not describe the tenancy tables, which
    // is why every caller in this file reaches them the same way.
    const { data: organizations, error } = await (supabase as any)
      .from("organizations")
      .select("id, name, slug, status, created_at")
      .order("name");
    if (error) throw error;

    const { data: owners, error: ownersError } = await (supabase as any)
      .from("organization_memberships")
      .select("organization_id, user_id")
      .eq("role", "owner")
      .eq("status", "active");
    if (ownersError) throw ownersError;

    const emailByUserId = await allUserEmails();
    const ownerEmailByOrganization = new Map(
      (owners ?? []).map((owner: { organization_id: string; user_id: string }) => [
        owner.organization_id,
        emailByUserId.get(owner.user_id) ?? "",
      ]),
    );

    // The administrator's own shop is not one of its clients: listing it there
    // would offer to suspend the account it is signed in with.
    const ownShopIds = new Set(
      (owners ?? [])
        .filter((owner: { user_id: string }) => owner.user_id === administratorId)
        .map((owner: { organization_id: string }) => owner.organization_id),
    );

    return (organizations ?? [])
      .filter((organization: { id: string }) => !ownShopIds.has(organization.id))
      .map((organization: { id: string }) => ({
        ...organization,
        ownerEmail: ownerEmailByOrganization.get(organization.id) ?? null,
      }));
  }

  async updateOrganizationStatus(organizationId: string, status: "active" | "suspended") {
    const { data, error } = await (supabase as any).from("organizations").update({ status }).eq("id", organizationId).select("id, name, status").single();
    if (error) throw error;
    return data;
  }


  /**
   * A shop for the administrator itself. It already has an account, so unlike
   * createOrganizationWithOwner there is no user to create: only the shop and
   * the membership that grants access to it. Membership is what opens the
   * operational screens, so this is how a platform account gets one.
   */
  /** The shops this user owns, in the shape the session endpoint returns. */
  async findOwnedOrganizations(userId: string) {
    const { data, error } = await (supabase as any)
      .from("organization_memberships")
      .select("role, organization:organizations(id, name, slug, status, logo_url)")
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) throw error;
    return (data ?? []).map((membership: any) => {
      const { logo_url: logoUrl, ...rest } = membership.organization ?? {};
      return { ...rest, logoUrl: logoUrl ?? null, role: membership.role };
    });
  }

  async createOwnOrganization(userId: string, input: { name: string; slug: string }) {
    const name = input.name.trim();
    const organization = await insertOrganization(name, input.slug);

    const { error: membershipError } = await (supabase as any)
      .from("organization_memberships")
      .insert({ organization_id: organization.id, user_id: userId, role: "owner", status: "active" });

    if (membershipError) {
      // No transaction spans both statements, so an orphan shop is undone here.
      await (supabase as any).from("organizations").delete().eq("id", organization.id);
      throw membershipError;
    }

    return { organization };
  }

  async createOrganizationWithOwner(input: CreateOrganizationInput) {
    const name = input.name.trim();
    const organization = await insertOrganization(name, input.slug);

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
