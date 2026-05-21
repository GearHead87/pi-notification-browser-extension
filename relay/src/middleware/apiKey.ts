import type { NextFunction, Request, Response } from "express";
import { config } from "../config/env.js";

/**
 * Guard middleware for any route that should require the shared API key.
 *
 * Mirrors the original status codes exactly:
 *   - 401 when the `x-api-key` header is absent.
 *   - 403 when the header is present but doesn't match.
 */
export function requireApiKey(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const headerValue = req.headers["x-api-key"];
	const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;

	if (!provided) {
		res.status(401).json({ ok: false, error: "Missing x-api-key header" });
		return;
	}

	if (provided !== config.apiKey) {
		res.status(403).json({ ok: false, error: "Invalid x-api-key" });
		return;
	}

	next();
}
