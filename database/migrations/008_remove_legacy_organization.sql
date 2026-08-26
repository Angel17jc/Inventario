-- Removes the organization that migration 003 created to hold the data from
-- before the system became multi-tenant.
--
-- It never received an owner, and once the platform administrator stopped
-- being admitted into tenant data it became reachable by nobody. What it held
-- was test data entered while the administrator still had that access.
--
-- The deletes run in dependency order rather than relying on cascades, so the
-- statement fails loudly if the shape of the data is not what is expected here.

DO $$
DECLARE
  legacy_id UUID;
  member_count INTEGER;
BEGIN
  SELECT id INTO legacy_id FROM organizations WHERE slug = 'legacy-inventory';
  IF legacy_id IS NULL THEN
    RAISE NOTICE 'legacy-inventory no existe: nada que hacer';
    RETURN;
  END IF;

  -- Refuse to delete a shop somebody is actually using.
  SELECT count(*) INTO member_count
  FROM organization_memberships
  WHERE organization_id = legacy_id;

  IF member_count > 0 THEN
    RAISE EXCEPTION 'legacy-inventory tiene % miembros: no se elimina', member_count;
  END IF;

  DELETE FROM credit_payments  WHERE organization_id = legacy_id;
  DELETE FROM credit_accounts  WHERE organization_id = legacy_id;
  DELETE FROM movements        WHERE organization_id = legacy_id;
  DELETE FROM products         WHERE organization_id = legacy_id;
  DELETE FROM categories       WHERE organization_id = legacy_id;
  DELETE FROM suppliers        WHERE organization_id = legacy_id;
  DELETE FROM organizations    WHERE id = legacy_id;

  RAISE NOTICE 'legacy-inventory eliminada';
END $$;
