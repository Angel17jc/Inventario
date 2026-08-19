import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../backend/app";

// Built once per warm container and reused across invocations, so route
// registration does not run on every request.
const app = createApp(createServer());

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  (await app)(req as never, res as never);
}
