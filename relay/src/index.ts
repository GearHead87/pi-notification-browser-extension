import { createServer } from "node:http";
import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { attachWebSocketServer } from "./ws/server.js";

/**
 * Entry point. Wires the Express app to a plain `http.Server` so the
 * WebSocket server can share the same port via `server.on("upgrade", …)`.
 */
function main(): void {
	const app = createApp();
	const server = createServer(app);

	attachWebSocketServer(server);

	server.listen(config.port, config.host, () => {
		logger.info(`listening on http://${config.host}:${config.port}`);
	});

	const shutdown = (signal: string) => {
		logger.info(`received ${signal}, shutting down`);
		server.close(() => process.exit(0));
		// Force-exit if something hangs.
		setTimeout(() => process.exit(1), 5_000).unref();
	};

	process.on("SIGINT", () => shutdown("SIGINT"));
	process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
