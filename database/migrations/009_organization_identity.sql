-- Lets a shop carry its own identity: the name can be corrected after the fact
-- and a logo can replace the generic mark in the interface.
--
-- The logo is stored as a URL, the same way products already reference their
-- image. The file itself lives in Supabase Storage under the organization's id,
-- so replacing a logo overwrites the previous file instead of leaving it behind.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN organizations.logo_url IS
  'URL pública del logo en Storage. NULL usa la marca genérica de la aplicación.';
