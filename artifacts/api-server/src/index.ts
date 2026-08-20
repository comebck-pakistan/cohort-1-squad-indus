import app from "./app.js";
import { logger } from "./lib/logger.js";
import { maybeAutostartBaileys } from "./lib/baileys-bridge.js";

if (!process.env.VERCEL) {
  const rawPort = process.env["PORT"] || "8080";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
    void maybeAutostartBaileys().catch((baileysErr) => {
      logger.error({ err: baileysErr }, "Baileys autostart failed");
    });
  });
}

export default app;
