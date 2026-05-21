import type { Server } from "node:http";
import { WebSocketServer } from "ws";
import { config } from "../config/env.js";
import { broadcaster } from "../services/broadcaster.js";
import { notificationStore } from "../services/notificationStore.js";
import type { RelayMessage } from "../types/index.js";
import { logger } from "../utils/logger.js";

/**
 * Mount a WebSocket server on the existing HTTP `Server` and enforce the
 * same x-api-key auth used by the REST routes.
 *
 * Browsers cannot set custom headers on the WebSocket handshake, so we
 * also accept the key via `?api_key=` for parity with the original relay.
 */
export function attachWebSocketServer(server: Server): WebSocketServer {
	const wss = new WebSocketServer({ noServer: true });

	server.on("upgrade", (req, socket, head) => {
		const headerValue = req.headers["x-api-key"];
		let provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;

		if (!provided) {
			try {
				const url = new URL(
					req.url ?? "/",
					`http://${req.headers.host ?? `${config.host}:${config.port}`}`,
				);
				provided = url.searchParams.get("api_key") ?? undefined;
			} catch {
				// ignore URL parse errors
			}
		}

		if (!provided || provided !== config.apiKey) {
			const status = !provided ? "401 Unauthorized" : "403 Forbidden";
			const body = !provided ? "Missing x-api-key header" : "Invalid x-api-key";
			socket.write(
				`HTTP/1.1 ${status}\r\n` +
					"content-type: text/plain; charset=utf-8\r\n" +
					`content-length: ${Buffer.byteLength(body)}\r\n` +
					"connection: close\r\n\r\n" +
					body,
			);
			socket.destroy();
			return;
		}

		wss.handleUpgrade(req, socket, head, (ws) => {
			wss.emit("connection", ws, req);
		});
	});

	wss.on("connection", (ws) => {
		logger.debug("ws client connected");

		// Replay the active notification (if any) so a freshly-reconnected
		// client immediately re-renders the overlay.
		const current = notificationStore.get();
		if (current) {
			ws.send(
				JSON.stringify({
					type: "notify",
					notification: current,
				} satisfies RelayMessage),
			);
		}
	});

	broadcaster.attach(wss);
	return wss;
}
