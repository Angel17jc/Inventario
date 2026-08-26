import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { platformService } from "../../platform-service.js";
import {
  createOrganizationSchema,
  createOwnOrganizationSchema,
  updateOrganizationStatusSchema,
} from "./platform-schemas.js";

interface PlatformRouteDependencies {
  requirePlatformAdmin: RequestHandler;
}

export function registerPlatformRoutes(app: Express, { requirePlatformAdmin }: PlatformRouteDependencies) {
  app.get("/api/platform/organizations", requirePlatformAdmin, async (_req, res) => {
    res.json(await platformService.listOrganizations());
  });

  app.post("/api/platform/organizations", requirePlatformAdmin, async (req, res) => {
    const organization = await platformService.createOrganizationWithOwner(createOrganizationSchema.parse(req.body));
    res.status(201).json(organization);
  });

  app.post("/api/platform/organizations/mine", requirePlatformAdmin, async (req, res) => {
    const input = createOwnOrganizationSchema.parse(req.body);
    res.status(201).json(await platformService.createOwnOrganization(req.user!.id, input));
  });

  app.patch("/api/platform/organizations/:organizationId/status", requirePlatformAdmin, async (req, res) => {
    const organizationId = z.string().uuid().parse(req.params.organizationId);
    const { status } = updateOrganizationStatusSchema.parse(req.body);
    res.json(await platformService.updateOrganizationStatus(organizationId, status));
  });
}
