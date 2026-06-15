import {
	addNotification,
	clearNotifications,
	removeNotification,
} from "./lib/storage";
import {
	DEFAULT_SETTINGS,
	SETTINGS_KEY,
	getSettings,
	normalizeRelayUrl,
	relayHttpToWs,
	type ExtensionSettings,
} from "./lib/settings";
import type { RelayMessage, RelayStatus, RuntimeMessage } from "./lib/types";

let currentSettings: ExtensionSettings = { ...DEFAULT_SETTINGS };
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let connectionGeneration = 0;
let settingsLoaded = false;

const RELAY_FETCH_TIMEOUT_MS = 4_000;

function buildRelayWsUrl(): string | null {
	const base = normalizeRelayUrl(currentSettings.relayUrl);
	const apiKey = currentSettings.apiKey?.trim();
	if (!base || !apiKey) return null;
	return `${relayHttpToWs(base)}/?api_key=${encodeURIComponent(apiKey)}`;
}

function buildRelayHeaders(): Record<string, string> | null {
	const apiKey = currentSettings.apiKey?.trim();
	if (!apiKey) return null;
	return { "content-type": "application/json", "x-api-key": apiKey };
}

function clearReconnectTimer(): void {
	if (reconnectTimer) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}
}

function disconnect(): void {
	connectionGeneration += 1;
	clearReconnectTimer();
	reconnectAttempt = 0;
	if (socket) {
		try {
			socket.close();
		} catch {
			// ignore
		}
		socket = null;
	}
}

function scheduleReconnect(generation: number): void {
	if (generation !== connectionGeneration) return;
	if (reconnectTimer) return;
	const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempt);
	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		if (generation !== connectionGeneration) return;
		reconnectAttempt += 1;
		connectRelay();
	}, delay);
}

function isActiveSocket(ws: WebSocket, generation: number): boolean {
	return socket === ws && generation === connectionGeneration;
}

async function fetchWithTimeout(
	input: RequestInfo | URL,
	init: RequestInit = {},
	timeoutMs = RELAY_FETCH_TIMEOUT_MS,
): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		return await fetch(input, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timeout);
	}
}

function formatRequestError(error: unknown, fallback: string): string {
	if (error instanceof DOMException && error.name === "AbortError") {
		return `${fallback}: request timed out`;
	}

	return error instanceof Error ? `${fallback}: ${error.message}` : fallback;
}

async function handleRelayMessage(message: RelayMessage): Promise<void> {
	console.debug("[pi-bg] relay message", message);

	if (message.type === "notify") {
		const list = await addNotification(message.notification);
		console.debug(
			"[pi-bg] stored notification",
			message.notification.id,
			"→ total:",
			list.length,
		);
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
	if (
		socket &&
		(socket.readyState === WebSocket.OPEN ||
			socket.readyState === WebSocket.CONNECTING)
	) {
		return;
	}

	const url = buildRelayWsUrl();
	if (!url) {
		// No relay URL or API key configured yet — wait until the user
		// fills them in via the options page. Settings changes will
		// trigger a fresh connection attempt.
		console.debug("[pi-bg] relay not configured, skipping connect");
		return;
	}

	const generation = connectionGeneration;
	let nextSocket: WebSocket;

	try {
		nextSocket = new WebSocket(url);
	} catch (error) {
		console.debug("[pi-bg] WebSocket constructor failed", error);
		scheduleReconnect(generation);
		return;
	}

	socket = nextSocket;

	nextSocket.addEventListener("open", () => {
		if (!isActiveSocket(nextSocket, generation)) return;
		reconnectAttempt = 0;
		console.debug("[pi-bg] relay connected");
	});

	nextSocket.addEventListener("message", (event) => {
		if (!isActiveSocket(nextSocket, generation)) return;
		try {
			const message = JSON.parse(String(event.data)) as RelayMessage;
			void handleRelayMessage(message);
		} catch {
			// Ignore malformed payloads from the relay.
		}
	});

	nextSocket.addEventListener("error", () => {
		if (!isActiveSocket(nextSocket, generation)) return;
		nextSocket.close();
	});

	nextSocket.addEventListener("close", () => {
		if (!isActiveSocket(nextSocket, generation)) return;
		socket = null;
		scheduleReconnect(generation);
	});
}

async function notifyRelayDismiss(id?: string): Promise<void> {
	const headers = buildRelayHeaders();
	const base = normalizeRelayUrl(currentSettings.relayUrl);
	if (!headers || !base) return;

	try {
		await fetchWithTimeout(`${base}/dismiss`, {
			method: "POST",
			headers,
			body: JSON.stringify(id ? { id } : {}),
		});
	} catch {
		// Overlay should still close even if the relay is offline.
	}
}

async function dismissOne(id: string): Promise<void> {
	await removeNotification(id);
	void notifyRelayDismiss(id);
}

async function dismissAll(): Promise<void> {
	await clearNotifications();
	void notifyRelayDismiss();
}

async function probeRelayStatus(): Promise<RelayStatus> {
	const base = normalizeRelayUrl(currentSettings.relayUrl);
	const apiKey = currentSettings.apiKey?.trim();
	const status: RelayStatus = {
		configured: !!(base && apiKey),
		relayUrl: base,
		hasApiKey: !!apiKey,
		serverReachable: false,
		authorized: false,
		wsConnected: socket?.readyState === WebSocket.OPEN,
		error: null,
		checkedAt: Date.now(),
	};

	if (!base) {
		status.error = "Relay URL is not configured";
		return status;
	}

	try {
		const pingRes = await fetchWithTimeout(`${base}/ping`, { method: "GET" });
		if (pingRes.ok) {
			status.serverReachable = true;
		} else {
			status.error = `Relay ping failed (HTTP ${pingRes.status})`;
			return status;
		}
	} catch (error) {
		status.error = formatRequestError(error, "Cannot reach relay");
		return status;
	}

	if (!apiKey) {
		status.error = "API key is not set";
		return status;
	}

	try {
		const healthRes = await fetchWithTimeout(`${base}/health`, {
			method: "GET",
			headers: { "x-api-key": apiKey },
		});
		if (healthRes.ok) {
			status.authorized = true;
		} else if (healthRes.status === 401 || healthRes.status === 403) {
			status.error = "Invalid API key";
		} else {
			status.error = `Health check failed (HTTP ${healthRes.status})`;
		}
	} catch (error) {
		status.error = formatRequestError(error, "Health check failed");
	}

	return status;
}

async function loadSettings(): Promise<void> {
	currentSettings = await getSettings();
	settingsLoaded = true;
}

async function applySettingsAndReconnect(): Promise<void> {
	await loadSettings();
	disconnect();
	connectRelay();
}

async function ensureConnection(): Promise<void> {
	if (!settingsLoaded) {
		await loadSettings();
	}

	if (
		socket &&
		(socket.readyState === WebSocket.OPEN ||
			socket.readyState === WebSocket.CONNECTING)
	) {
		return;
	}

	connectRelay();
}

chrome.storage.onChanged.addListener((changes, areaName) => {
	if (areaName !== "local") return;
	if (SETTINGS_KEY in changes) {
		console.debug("[pi-bg] settings changed → reconnecting");
		void applySettingsAndReconnect();
	}
});

chrome.runtime.onInstalled.addListener(() => {
	void applySettingsAndReconnect();
});

chrome.runtime.onStartup.addListener(() => {
	void applySettingsAndReconnect();
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
	if (!message || typeof message !== "object") return false;

	if (message.type === "ensure-connection") {
		void ensureConnection();
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

	if (message.type === "get-relay-status") {
		void (async () => {
			await loadSettings();
			const status = await probeRelayStatus();
			sendResponse(status);
		})();
		return true;
	}

	if (message.type === "open-options-page") {
		chrome.runtime.openOptionsPage();
		sendResponse({ ok: true });
		return false;
	}

	return false;
});

void applySettingsAndReconnect();
