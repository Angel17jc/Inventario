import type { Express, RequestHandler } from "express";
import { supabase } from "../../db.js";
import { fail, sendApiError } from "../../errors.js";
import { errorCodes } from "../../../shared/errors.js";
import {
  LOGO_CONTENT_TYPES,
  LOGO_MAX_BYTES,
  updateOrganizationRequestSchema,
} from "../../../shared/schema.js";

const LOGO_BUCKET = "organization-logos";

const extensionByContentType: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Created on first use rather than in a migration: Storage is not part of the
 * SQL schema, so an installation that never uploads a logo never needs the
 * bucket. Repeated calls are harmless.
 */
async function ensureLogoBucket() {
  const { data } = await supabase.storage.getBucket(LOGO_BUCKET);
  if (data) return;

  const { error } = await supabase.storage.createBucket(LOGO_BUCKET, {
    public: true,
    fileSizeLimit: LOGO_MAX_BYTES,
    allowedMimeTypes: [...LOGO_CONTENT_TYPES],
  });
  // Two owners uploading at once both find no bucket and both create it; the
  // loser is fine. Any other failure has to surface here, or the upload right
  // after fails instead and reports a symptom rather than the cause.
  if (error && !/already exists/i.test(error.message)) throw error;
}

const organizationColumns = "id, name, slug, status, logo_url";

async function updateOrganization(organizationId: string, changes: Record<string, unknown>) {
  const { data, error } = await (supabase as any)
    .from("organizations")
    .update(changes)
    .eq("id", organizationId)
    .select(organizationColumns)
    .single();
  if (error) throw error;
  // camelCase on the way out, matching what /api/organizations/me returns.
  const { logo_url: logoUrl, ...rest } = data ?? {};
  return { ...rest, logoUrl: logoUrl ?? null };
}

interface OrganizationRouteDependencies {
  requireOwner: RequestHandler;
  readLogoUpload: RequestHandler;
}

export function registerOrganizationRoutes(
  app: Express,
  { requireOwner, readLogoUpload }: OrganizationRouteDependencies,
) {
  app.patch("/api/organization", requireOwner, async (req, res) => {
    try {
      const { name } = updateOrganizationRequestSchema.parse(req.body);
      return res.json(await updateOrganization(req.organization!.id, { name }));
    } catch (error) {
      return sendApiError(res, error);
    }
  });

  app.put("/api/organization/logo", requireOwner, readLogoUpload, async (req, res) => {
    try {
      const contentType = req.header("content-type") ?? "";
      if (!LOGO_CONTENT_TYPES.includes(contentType as (typeof LOGO_CONTENT_TYPES)[number])) {
        return fail(res, 400, errorCodes.validation, "El logo debe ser una imagen PNG, JPG o WebP.");
      }

      const file = req.body as Buffer;
      if (!Buffer.isBuffer(file) || file.byteLength === 0) {
        return fail(res, 400, errorCodes.validation, "No recibimos la imagen. Vuelve a intentarlo.");
      }
      if (file.byteLength > LOGO_MAX_BYTES) {
        return fail(res, 400, errorCodes.validation, "El logo no puede superar los 512 KB.");
      }

      await ensureLogoBucket();

      // Named after the shop, so a new logo replaces the previous file instead
      // of leaving it orphaned in the bucket.
      const path = `${req.organization!.id}.${extensionByContentType[contentType]}`;
      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(path, file, { contentType, upsert: true });
      if (uploadError) throw uploadError;

      const { data: published } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
      // The path never changes, so without this the CDN would keep serving the
      // logo that was just replaced.
      const logoUrl = `${published.publicUrl}?v=${Date.now()}`;

      return res.json(await updateOrganization(req.organization!.id, { logo_url: logoUrl }));
    } catch (error) {
      return sendApiError(res, error);
    }
  });

  app.delete("/api/organization/logo", requireOwner, async (req, res) => {
    try {
      return res.json(await updateOrganization(req.organization!.id, { logo_url: null }));
    } catch (error) {
      return sendApiError(res, error);
    }
  });
}
