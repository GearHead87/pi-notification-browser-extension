import { WebSocket, type WebSocketServer } from "ws";
import type { RelayMessage } from "../types/index.js";

/**
 * Thin wrapper around the `ws` server that lets controllers fan out
 * `RelayMessage`s without needing a direct reference to the WSS instance.
 *
 * The WSS is attached once at boot via `attach()` and re-used everywhere
 * through the exported singleton.
 */
class Broadcaster {
	private wss: WebSocketServer | null = null;

	attach(wss: WebSocketServer): void {
		this.wss = wss;
	}

	broadcast(message: RelayMessage): void {
		if (!this.wss) return;
		const payload = JSON.stringify(message);
		for (const client of this.wss.clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(payload);
			}
		}
	}
}

export const broadcaster = new Broadcaster();
