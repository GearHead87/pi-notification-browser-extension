import type { Request, Response } from "express";
import { broadcaster } from "../services/broadcaster.js";
import { notificationStore } from "../services/notificationStore.js";
import { logger } from "../utils/logger.js";

/**
 * POST /dismiss — clear the active notification (optionally guarded by `id`)
 * and tell every connected client to do the same.
 *
 * Behaviour matches the original relay: if `id` is omitted, OR if there is
 * nothing active, OR if `id` matches the current notification, we clear
 * and broadcast. A mismatched `id` is a successful no-op (returns 200).
 */
export function dismiss(req: Request, res: Response): void {
	try {
		const payload = (req.body ?? {}) as { id?: string };
		const currentId = notificationStore.get()?.id;
		const { cleared } = notificationStore.clear(payload.id);

		if (cleared) {
			broadcaster.broadcast({ type: "dismiss", id: payload.id ?? currentId });
			logger.info(`dismiss ${payload.id ?? currentId ?? "active"}`);
		}

		res.status(200).json({ ok: true });
	} catch (error) {
		res.status(400).json({
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
