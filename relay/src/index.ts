import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocket, WebSocketServer } from "ws";

interface ProjectNotification {
	id: string;
	title: string;
	projectName: string;
	projectPath: string;
	model?: string;
	timestamp: number;
}

type RelayMessage =
	| {
			type: "notify";
			notification: ProjectNotification;
	  }
	| {
			type: "dismiss";
			id?: string;
	  };

const PORT = Number(process.env.PI_NOTIFICATION_RELAY_PORT ?? 48291);
const API_KEY = process.env.PI_NOTIFICATION_RELAY_API_KEY;

if (!API_KEY) {
	console.error(
		"[relay] PI_NOTIFICATION_RELAY_API_KEY is not set. Refusing to start without an API key.",
	);
	process.exit(1);
}

let activeNotification: ProjectNotification | null = null;

function json(res: ServerResponse, statusCode: number, body: unknown): void {
	res.writeHead(statusCode, {
		"content-type": "application/json; charset=utf-8",
		"access-control-allow-origin": "*",
		"access-control-allow-methods": "GET, POST, OPTIONS",
		"access-control-allow-headers": "content-type, x-api-key",
	});
	res.end(JSON.stringify(body));
}

function requireApiKey(req: IncomingMessage, res: ServerResponse): boolean {
	const headerValue = req.headers["x-api-key"];
	const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;

	if (!provided) {
		json(res, 401, { ok: false, error: "Missing x-api-key header" });
		return false;
	}

	if (provided !== API_KEY) {
		json(res, 403, { ok: false, error: "Invalid x-api-key" });
		return false;
	}

	return true;
}

function broadcast(message: RelayMessage): void {
	const payload = JSON.stringify(message);
	for (const client of wss.clients) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(payload);
		}
	}
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}

	const raw = Buffer.concat(chunks).toString("utf8").trim();
	if (!raw) {
		return {} as T;
	}

	return JSON.parse(raw) as T;
}

function normalizeNotification(input: Partial<ProjectNotification>): ProjectNotification {
	if (!input.id || !input.projectPath) {
		throw new Error("Notification payload must include at least id and projectPath");
	}

	return {
		id: String(input.id),
		title: input.title ? String(input.title) : "Task complete",
		projectName: input.projectName ? String(input.projectName) : String(input.projectPath),
		projectPath: String(input.projectPath),
		model: input.model ? String(input.model) : undefined,
		timestamp: Number(input.timestamp ?? Date.now()),
	};
}

const server = createServer(async (req, res) => {
	const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `127.0.0.1:${PORT}`}`);

	if (req.method === "OPTIONS") {
		json(res, 200, { ok: true });
		return;
	}

	if (!requireApiKey(req, res)) {
		return;
	}

	if (req.method === "GET" && url.pathname === "/health") {
		json(res, 200, { ok: true, active: !!activeNotification });
		return;
	}

	if (req.method === "GET" && url.pathname === "/active") {
		json(res, 200, { notification: activeNotification });
		return;
	}

	if (req.method === "POST" && url.pathname === "/notify") {
		try {
			const payload = await readJson<Partial<ProjectNotification>>(req);
			activeNotification = normalizeNotification(payload);
			broadcast({
				type: "notify",
				notification: activeNotification,
			});
			console.log(`[relay] notify ${activeNotification.projectName} -> ${activeNotification.projectPath}`);
			json(res, 200, { ok: true });
		} catch (error) {
			json(res, 400, {
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			});
		}
		return;
	}

	if (req.method === "POST" && url.pathname === "/dismiss") {
		try {
			const payload = await readJson<{ id?: string }>(req);
			const currentId = activeNotification?.id;
			if (!payload.id || !currentId || payload.id === currentId) {
				activeNotification = null;
				broadcast({ type: "dismiss", id: payload.id ?? currentId });
				console.log(`[relay] dismiss ${payload.id ?? currentId ?? "active"}`);
			}
			json(res, 200, { ok: true });
		} catch (error) {
			json(res, 400, {
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			});
		}
		return;
	}

	json(res, 404, { ok: false, error: "Not found" });
});

const wss = new WebSocketServer({
	noServer: true,
});

server.on("upgrade", (req, socket, head) => {
	const headerValue = req.headers["x-api-key"];
	let provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;

	// Browsers cannot set custom headers on the WebSocket handshake,
	// so we also allow the key via a query parameter (?api_key=...).
	if (!provided) {
		try {
			const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `127.0.0.1:${PORT}`}`);
			provided = url.searchParams.get("api_key") ?? undefined;
		} catch {
			// ignore URL parse errors
		}
	}

	if (!provided || provided !== API_KEY) {
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

wss.on("connection", (socket) => {
	if (activeNotification) {
		socket.send(
			JSON.stringify({
				type: "notify",
				notification: activeNotification,
			} satisfies RelayMessage),
		);
	}
});

server.listen(PORT, "127.0.0.1", () => {
	console.log(`[relay] listening on http://127.0.0.1:${PORT}`);
});
