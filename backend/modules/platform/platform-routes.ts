import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { platformService } from "../../platform-service.js";
import { fail } from "../../errors.js";
import { errorCodes } from "../../../shared/errors.js";
import {
  createOrganizationSchema,
  updateOrganizationStatusSchema,
} from "./platform-schemas.js";

interface PlatformRouteDependencies {
  requirePlatformAdmin: RequestHandler;
}

export function registerPlatformRoutes(app: Express, { requirePlatformAdmin }: PlatformRouteDependencies) {
  app.get("/api/platform/organizations", requirePlatformAdmin, async (req, res) => {
    res.json(await platformService.listOrganizations(req.user!.id));
  });

  app.post("/api/platform/organizations", requirePlatformAdmin, async (req, res) => {
    const organization = await platformService.createOrganizationWithOwner(createOrganizationSchema.parse(req.body));
    res.status(201).json(organization);
  });

  app.patch("/api/platform/organizations/:organizationId/status", requirePlatformAdmin, async (req, res) => {
    const organizationId = z.string().uuid().parse(req.params.organizationId);
    const { status } = updateOrganizationStatusSchema.parse(req.body);

    // The client list already leaves the administrator's own shop out, because
    // offering to suspend the account you are signed in with is not an offer.
    // The endpoint took any id, though, so the guard has to live here too: a
    // suspended organization is refused by the API, and the administrator
    // would have locked itself out of its own shop with no way back in.
    if (await platformService.isOwnedBy(organizationId, req.user!.id)) {
      return fail(res, 409, errorCodes.conflict, "No puedes suspender tu propia licorería.");
    }

    return res.json(await platformService.updateOrganizationStatus(organizationId, status));
  });
}
