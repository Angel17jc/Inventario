import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

// The backend is imported lazily. backend/db.ts validates its configuration
// while the module is still loading, and a throw at that point aborts the
// invocation before any handler code runs, leaving only an opaque
// FUNCTION_INVOCATION_FAILED. Importing inside the promise makes that failure
// catchable, so the real cause reaches the runtime logs.
let bootstrap: Promise<RequestHandler | null> | undefined;

function start(): Promise<RequestHandler | null> {
  return import("../backend/app")
    .then(({ createApp }) => createApp(createServer()))
    .then((app) => app as unknown as RequestHandler)
    .catch((error: unknown) => {
      console.error("API initialisation failed:", error);
      return null;
    });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  bootstrap ??= start();
  const app = await bootstrap;

  if (!app) {
    bootstrap = undefined;
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ message: "API initialisation failed. Check the runtime logs." }));
    return;
  }

  app(req, res);
}
