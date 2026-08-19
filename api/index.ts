import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../backend/app";

// Built once per warm container and reused across invocations, so route
// registration does not run on every request. A failure here is almost always
// missing configuration, which would otherwise surface as an opaque
// FUNCTION_INVOCATION_FAILED with no clue as to the cause.
const appPromise = createApp(createServer()).catch((error: unknown) => {
  console.error("API initialisation failed:", error);
  return null;
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await appPromise;

  if (!app) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ message: "API initialisation failed" }));
    return;
  }

  app(req as never, res as never);
}
