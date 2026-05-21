import type { Request, Response } from "express";
import { notificationStore } from "../services/notificationStore.js";

/**
 * GET /health — authenticated health probe. Reports whether an active
 * notification is currently held in memory.
 */
export function health(_req: Request, res: Response): void {
	res.status(200).json({ ok: true, active: !!notificationStore.get() });
}

/**
 * GET /active — return the currently-active notification (or `null`).
 * Used by clients to resync after a reconnect.
 */
export function active(_req: Request, res: Response): void {
	res.status(200).json({ notification: notificationStore.get() });
}
