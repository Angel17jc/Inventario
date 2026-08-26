import "dotenv/config";
import { createServer } from "http";
import { createApp, log } from "./app.js";
import { setupVite } from "./vite.js";

// The development server. In production Vercel serves the built frontend as
// static files and runs the same Express app from api/index.ts, so nothing
// here is deployed.
(async () => {
  const httpServer = createServer();
  const app = await createApp(httpServer);
  httpServer.on("request", app);

  // Vite goes on last: its catch-all would otherwise swallow the API routes.
  await setupVite(httpServer, app);

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, () => {
    log(`serving on port ${port}`);
    log(`http://localhost:${port}`);
  });
})();
