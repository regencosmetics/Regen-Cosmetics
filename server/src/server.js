import env from "./config/env.js";
import logger from "./utils/logger.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { loadSettings } from "./services/settingsService.js";
import { createApp } from "./app.js";
import { startJobs, stopJobs } from "./jobs/index.js";

async function main() {
  await connectDb();
  await loadSettings();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log("Server is running 🏃");
  });

  startJobs();

  const shutdown = async () => {
    stopJobs();
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  logger.error({ err: err.message }, "Failed to start");
  process.exit(1);
});
