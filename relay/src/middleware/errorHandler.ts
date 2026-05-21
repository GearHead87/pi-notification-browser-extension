import type {
	ErrorRequestHandler,
	NextFunction,
	Request,
	Response,
} from "express";
import { logger } from "../utils/logger.js";

/**
 * 404 fallthrough. Kept consistent with the previous implementation's
 * `{ ok: false, error: "Not found" }` response body.
 */
export function notFoundHandler(
	_req: Request,
	res: Response,
	_next: NextFunction,
): void {
	res.status(404).json({ ok: false, error: "Not found" });
}

/**
 * Catch-all error handler.
 *
 * Most errors that reach here are body-parser failures (malformed JSON) or
 * thrown by controllers when payload validation fails — we surface them
 * with HTTP 400 and the same JSON shape every other route uses.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
	const message = err instanceof Error ? err.message : String(err);
	logger.warn("request error:", message);
	res.status(400).json({ ok: false, error: message });
};
