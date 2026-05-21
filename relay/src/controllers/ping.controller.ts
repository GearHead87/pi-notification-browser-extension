import type { Request, Response } from "express";

/**
 * GET /ping — public liveness probe.
 *
 * Intentionally does NOT require the API key so that clients (e.g. the
 * browser extension popup) can detect whether the relay process is
 * running without revealing or needing the shared secret.
 */
export function ping(_req: Request, res: Response): void {
	res.status(200).json({ ok: true, service: "pi-notification-relay" });
}
