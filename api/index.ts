import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

// Server-only configuration the backend reads while its modules load.
const REQUIRED_VARIABLES = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

// The backend is imported lazily. backend/db.ts validates its configuration at
// module scope, and a throw there aborts the invocation before any handler code
// runs, leaving only an opaque FUNCTION_INVOCATION_FAILED. Importing inside the
// promise brings that window inside the catch.
let bootstrap: Promise<RequestHandler | null> | undefined;
let failure: { name: string; code: string; detail: string } | null = null;

function start(): Promise<RequestHandler | null> {
  return import("../backend/app")
    .then(({ createApp }) => createApp(createServer()))
    .then((app) => app as unknown as RequestHandler)
    .catch((error: unknown) => {
      console.error("API initialisation failed:", error);
      const cause = error as { name?: string; code?: string };
      failure = {
        name: cause?.name ?? "Error",
        code: cause?.code ?? "none",
        // Module specifier only; it names project files, never a value.
        detail: String(cause?.message ?? "").slice(0, 300),
      };
      return null;
    });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  bootstrap ??= start();
  const app = await bootstrap;

  if (!app) {
    // Reports which variables are missing and how the import failed. Only
    // presence is disclosed, never a value.
    const configured = Object.fromEntries(
      REQUIRED_VARIABLES.map((name) => [name, Boolean(process.env[name])]),
    );
    const diagnosis = failure;
    bootstrap = undefined;
    failure = null;

    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ message: "API initialisation failed", configured, error: diagnosis }));
    return;
  }

  app(req, res);
}
