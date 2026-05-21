/**
 * Tiny console logger with a consistent `[relay]` prefix. Kept dependency-free
 * on purpose — swap for pino/winston later if we ever need structured logs.
 */
export const logger = {
	info: (...args: unknown[]): void => {
		console.log("[relay]", ...args);
	},
	warn: (...args: unknown[]): void => {
		console.warn("[relay]", ...args);
	},
	error: (...args: unknown[]): void => {
		console.error("[relay]", ...args);
	},
	debug: (...args: unknown[]): void => {
		if (process.env.NODE_ENV !== "production") {
			console.debug("[relay]", ...args);
		}
	},
};
