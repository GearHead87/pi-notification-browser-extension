import express, { type Express } from "express";
import { corsMiddleware, handleOptions } from "./middleware/cors.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import routes from "./routes/index.js";

/**
 * Build (but do not start) the Express application.
 *
 * The middleware order intentionally mirrors the previous hand-rolled
 * `http.createServer` handler:
 *   1. CORS headers on every response.
 *   2. Short-circuit OPTIONS preflight requests with 200.
 *   3. JSON body parsing.
 *   4. Feature routes (each route opts in to `requireApiKey` as needed).
 *   5. 404 fallback.
 *   6. Error handler (must be last).
 */
export function createApp(): Express {
	const app = express();

	app.disable("x-powered-by");
	app.disable("etag");

	app.use(corsMiddleware);
	app.use(handleOptions);

	// Same effective limit as the old hand-rolled parser; `express.json()`
	// silently leaves `req.body` as `{}` for empty bodies, matching the
	// previous `readJson` behaviour.
	app.use(express.json({ limit: "1mb" }));

	app.use(routes);

	app.use(notFoundHandler);
	app.use(errorHandler);

	return app;
}
