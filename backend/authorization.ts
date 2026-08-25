import type { NextFunction, Request, Response } from "express";
import type { OrganizationRole } from "../shared/tenancy.js";
import { errorCodes } from "../shared/errors.js";
import { fail } from "./errors.js";

export function requireOrganizationRole(...allowedRoles: OrganizationRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.organization) return fail(res, 401, errorCodes.organizationRequired, "No hay una empresa seleccionada.");
    if (req.organization.role !== "platform_admin" && !allowedRoles.includes(req.organization.role)) {
      return fail(res, 403, errorCodes.forbidden, "Tu rol no permite realizar esta acción.");
    }
    return next();
  };
}
