import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { platformService } from "../../platform-service.js";
import {
  createOrganizationSchema,
  updateOrganizationStatusSchema,
} from "./platform-schemas.js";

interface PlatformRouteDependencies {
  requirePlatformAdmin: RequestHandler;
}

export function registerPlatformRoutes(app: Express, { requirePlatformAdmin }: PlatformRouteDependencies) {
  app.post("/api/platform/organizations", requirePlatformAdmin, async (req, res) => {
    const organization = await platformService.createOrganizationWithOwner(createOrganizationSchema.parse(req.body));
    res.status(201).json(organization);
  });

  app.patch("/api/platform/organizations/:organizationId/status", requirePlatformAdmin, async (req, res) => {
    const organizationId = z.string().uuid().parse(req.params.organizationId);
    const { status } = updateOrganizationStatusSchema.parse(req.body);
    res.json(await platformService.updateOrganizationStatus(organizationId, status));
  });
}
