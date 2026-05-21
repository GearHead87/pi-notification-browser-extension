import type { Request, Response } from "express";
import { broadcaster } from "../services/broadcaster.js";
import {
	normalizeNotification,
	notificationStore,
} from "../services/notificationStore.js";
import type { ProjectNotification } from "../types/index.js";
import { logger } from "../utils/logger.js";

/**
 * POST /notify — accept a project completion notification, store it as the
 * active one, and broadcast it to every connected WebSocket client.
 */
export function notify(req: Request, res: Response): void {
	try {
		const payload = (req.body ?? {}) as Partial<ProjectNotification>;
		const notification = normalizeNotification(payload);

		notificationStore.set(notification);
		broadcaster.broadcast({ type: "notify", notification });

		logger.info(
			`notify ${notification.projectName} -> ${notification.projectPath}`,
		);
		res.status(200).json({ ok: true });
	} catch (error) {
		res.status(400).json({
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
