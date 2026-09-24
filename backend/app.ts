import express, { type Request, type Response, type NextFunction } from "express";
import type { Server } from "http";
import { registerRoutes } from "./routes.js";
import { fail, getApiError } from "./errors.js";
import { errorCodes } from "../shared/errors.js";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Shared by the standalone server (backend/index.ts) and the Vercel serverless
// entry point (api/index.ts) so both expose exactly the same API surface.
export async function createApp(httpServer: Server) {
  const app = express();

  // Express advertises itself by default, which only helps someone matching
  // known vulnerabilities to the stack.
  app.disable("x-powered-by");

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    // API responses are private to the caller and must not be cached anywhere.
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  // No verify hook: it kept a second copy of every request body in memory for
  // a signature check this API never does. No urlencoded parser either —
  // nothing here posts a form, and the browser sends JSON.
  app.use(express.json());

  // Only the request line is logged. Response bodies used to be written here,
  // which sent customer names, balances and stock figures to the platform's log
  // storage on every call. The path is safe to write because every route
  // identifies records by id: none carries a name in its URL, and a new one
  // should not either.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
      }
    });
    next();
  });

  await registerRoutes(httpServer, app);

  // After every route, so only an address nothing answered reaches it, and
  // behind the same guards: without a session this is still a 401, which says
  // nothing about which routes exist. Express's default was an HTML page.
  app.use("/api", (_req, res) => fail(res, 404, errorCodes.notFound, "Esa dirección de la API no existe."));

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    // The same body every route answers with: the interface reacts to the code,
    // and an error that reached this far used to arrive without one.
    const { status, code, message } = getApiError(err);
    // Only failures that are ours. A broken JSON body or a retired product is
    // the request's problem, and logging it as an internal error buried the
    // ones that were.
    if (status >= 500) console.error("Internal Server Error:", err);
    return res.status(status).json({ code, message });
  });

  return app;
}
