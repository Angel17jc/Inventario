export const platformRoles = ["platform_admin"] as const;
export type PlatformRole = (typeof platformRoles)[number];

// app_metadata, not user_metadata: only the service role can write it, so a
// user cannot make themselves an administrator by editing their own profile.
// The database's is_platform_admin() reads the same claim from the JWT.
export function isPlatformAdmin(appMetadata: Record<string, unknown> | undefined): boolean {
  const role: PlatformRole = "platform_admin";
  return appMetadata?.platform_role === role;
}

export const organizationRoles = ["owner", "manager", "cashier"] as const;
export type OrganizationRole = (typeof organizationRoles)[number];

export const organizationStatuses = ["active", "suspended"] as const;
export type OrganizationStatus = (typeof organizationStatuses)[number];

export const membershipStatuses = ["active", "disabled"] as const;
export type MembershipStatus = (typeof membershipStatuses)[number];
