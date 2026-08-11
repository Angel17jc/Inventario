import type { NextFunction, Request, Response } from "express";
import { supabase } from "./db";

export const roles = ["admin", "cashier"] as const;
export type Role = (typeof roles)[number];

export interface AuthenticatedUser {
  id: string;
  email: string | undefined;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function getBearerToken(request: Request): string | undefined {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) return undefined;
  return authorization.slice("Bearer ".length).trim() || undefined;
}

export async function requireAuthenticatedUser(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ message: "Authentication required" });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ message: "Invalid or expired session" });

  const role = user.app_metadata.role;
  if (!roles.includes(role)) {
    return res.status(403).json({ message: "User role is not authorized" });
  }

  req.user = { id: user.id, email: user.email, role };
  return next();
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Authentication required" });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    return next();
  };
}
