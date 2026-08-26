import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(120).optional().default(""),
  ownerEmail: z.string().trim().email().max(255),
  ownerPassword: z.string().min(12).max(128),
});

export const updateOrganizationStatusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});


