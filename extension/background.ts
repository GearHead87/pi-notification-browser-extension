import {
	addNotification,
	clearNotifications,
	removeNotification,
} from "./lib/storage";
import type { RelayMessage, RuntimeMessage } from "./lib/types";

const RELAY_HTTP_URL = "http://127.0.0.1:48291";
const RELAY_WS_URL = "ws://127.0.0.1:48291";

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;

function scheduleReconnect(): void {
	if (reconnectTimer) return;
	const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempt);
	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		reconnectAttempt += 1;
		connectRelay();
	}, delay);
}

async function handleRelayMessage(message: RelayMessage): Promise<void> {
	console.debug("[pi-bg] relay message", message);

	if (message.type === "notify") {
		const list = await addNotification(message.notification);
		console.debug("[pi-bg] stored notification", message.notification.id, "→ total:", list.length);
		return;
	}

	if (message.type === "dismiss") {
		if (message.id) {
			const list = await removeNotification(message.id);
			console.debug("[pi-bg] dismissed", message.id, "→ remaining:", list.length);
		} else {
			await clearNotifications();
			console.debug("[pi-bg] dismissed all");
		}
	}
}

function connectRelay(): void {
	if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
		return;
	}

	try {
		socket = new WebSocket(RELAY_WS_URL);
	} catch {
		scheduleReconnect();
		return;
	}

	socket.addEventListener("open", () => {
		reconnectAttempt = 0;
	});

	socket.addEventListener("message", (event) => {
		try {
			const message = JSON.parse(String(event.data)) as RelayMessage;
			void handleRelayMessage(message);
		} catch {
			// Ignore malformed payloads from the relay.
		}
	});

	socket.addEventListener("error", () => {
		socket?.close();
	});

	socket.addEventListener("close", () => {
		socket = null;
		scheduleReconnect();
	});
}

async function notifyRelayDismiss(id?: string): Promise<void> {
	try {
		await fetch(`${RELAY_HTTP_URL}/dismiss`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(id ? { id } : {}),
		});
	} catch {
		// Overlay should still close even if the relay is offline.
	}
}

async function dismissOne(id: string): Promise<void> {
	await removeNotification(id);
	await notifyRelayDismiss(id);
}

async function dismissAll(): Promise<void> {
	await clearNotifications();
	await notifyRelayDismiss();
}

chrome.runtime.onInstalled.addListener(() => {
	connectRelay();
});

chrome.runtime.onStartup.addListener(() => {
	connectRelay();
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
	if (!message || typeof message !== "object") return false;

	if (message.type === "ensure-connection") {
		connectRelay();
		sendResponse({ ok: true });
		return false;
	}

	if (message.type === "dismiss-notification") {
		void dismissOne(message.id).finally(() => {
			sendResponse({ ok: true });
		});
		return true;
	}

	if (message.type === "dismiss-all-notifications") {
		void dismissAll().finally(() => {
			sendResponse({ ok: true });
		});
		return true;
	}

	return false;
});

connectRelay();
