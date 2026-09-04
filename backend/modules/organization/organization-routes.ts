import type { Express, RequestHandler } from "express";
import { supabase } from "../../db.js";
import { fail, sendApiError } from "../../errors.js";
import { detectImageFormat } from "../../image-bytes.js";
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

/**
 * Removes the shop's logo from the bucket, whichever format it was saved in.
 *
 * The object is named after the shop and carries the extension of the format
 * it arrived as, so a shop that uploads a PNG over a JPG leaves the JPG
 * behind: same shop, different path. The bucket is public and the paths are
 * predictable, so an orphan there stays readable to anyone who guesses it —
 * including after the owner asked for the logo to be removed. All three
 * possible names go, which also keeps a change of format from accumulating.
 */
async function removeStoredLogos(organizationId: string) {
  const paths = Object.values(extensionByContentType).map(
    (extension) => `${organizationId}.${extension}`,
  );
  const { error } = await supabase.storage.from(LOGO_BUCKET).remove(paths);
  // Removing a name that is not there is not a failure; a bucket that was
  // never created is not either, since then there is nothing to remove.
  if (error && !/not found|does not exist/i.test(error.message)) throw error;
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

      // The content type is a header the caller writes, and the bucket is
      // public: whatever lands there is served to anyone with the URL. The
      // bytes have to say the same thing the header does.
      const format = detectImageFormat(file);
      if (!format) {
        return fail(res, 400, errorCodes.validation, "Ese archivo no es una imagen PNG, JPG o WebP.");
      }
      if (format !== contentType) {
        return fail(res, 400, errorCodes.validation, "El archivo no coincide con el tipo de imagen que dice ser.");
      }

      await ensureLogoBucket();

      // Named after the shop, so a new logo of the same format overwrites the
      // previous file. A different format writes a different name, so the old
      // one is removed rather than left readable in a public bucket.
      await removeStoredLogos(req.organization!.id);
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
      // The row is cleared first: if removing the object fails, the shop still
      // stops showing a logo it asked to remove, and what is left behind is an
      // unreferenced file rather than a broken image.
      const organization = await updateOrganization(req.organization!.id, { logo_url: null });
      await removeStoredLogos(req.organization!.id);
      return res.json(organization);
    } catch (error) {
      return sendApiError(res, error);
    }
  });
}
