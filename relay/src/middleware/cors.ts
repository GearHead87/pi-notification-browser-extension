import type { NextFunction, Request, Response } from "express";

/**
 * Apply the same permissive CORS headers the original relay used. Kept as
 * a hand-rolled middleware (instead of pulling `cors`) so the response
 * shape — including the OPTIONS preflight body — is byte-for-byte
 * identical to the previous implementation.
 */
export function corsMiddleware(
	_req: Request,
	res: Response,
	next: NextFunction,
): void {
	res.setHeader("access-control-allow-origin", "*");
	res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
	res.setHeader("access-control-allow-headers", "content-type, x-api-key");
	next();
}

/**
 * Short-circuit CORS preflight requests with `{ ok: true }`, matching the
 * original behaviour exactly (and importantly, before any API-key check).
 */
export function handleOptions(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	if (req.method === "OPTIONS") {
		res.status(200).json({ ok: true });
		return;
	}
	next();
}
