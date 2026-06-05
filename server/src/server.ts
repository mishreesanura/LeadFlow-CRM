import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function bootstrap() {
  try {
    await connectDatabase();
    const server = app.listen(env.PORT, () => {
      console.log(`API listening on http://localhost:${env.PORT}`);
    });

    const shutdown = async () => {
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start API server", error);
    process.exit(1);
  }
}

void bootstrap();
