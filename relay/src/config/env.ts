import { config as loadDotenv } from "dotenv";
import path from "node:path";

/**
 * Resolve and load the relay's `.env` file.
 *
 * We try, in order:
 *   1. `<cwd>/.env`              — when running via `pnpm dev` / `npm start`
 *      from the relay package root, this is what gets picked up.
 *   2. `<relay-root>/.env`       — fallback for when the process is started
 *      from somewhere else (e.g. the monorepo root).
 *
 * `dotenv` is non-destructive: it never overrides variables that are
 * already set in the environment, so explicit shell overrides still win.
 */
function loadEnvFiles(): void {
	// `__dirname` resolves to `<relay>/src/config` at runtime (under both
	// `tsx` and the compiled CommonJS output in `dist/config`).
	const relayRoot = path.resolve(__dirname, "..", "..");

	loadDotenv({ quiet: true }); // <cwd>/.env
	loadDotenv({ path: path.join(relayRoot, ".env"), quiet: true });
}

loadEnvFiles();

export type NodeEnv = "development" | "production" | "test";

export interface AppConfig {
	/** TCP port the HTTP + WebSocket server listens on. */
	port: number;
	/** Network interface to bind to. */
	host: string;
	/** Shared secret required on every authenticated request. */
	apiKey: string;
	/** Standard Node env flag. */
	nodeEnv: NodeEnv;
}

function requireString(name: string): string {
	const value = process.env[name];
	if (value === undefined || value.trim() === "") {
		console.error(
			`[relay] ${name} is not set. Refusing to start without it.`,
		);
		process.exit(1);
	}
	return value;
}

function optionalNumber(name: string, fallback: number): number {
	const raw = process.env[name];
	if (raw === undefined || raw.trim() === "") return fallback;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		console.error(`[relay] ${name} must be a positive number, got: ${raw}`);
		process.exit(1);
	}
	return parsed;
}

function optionalString(name: string, fallback: string): string {
	const value = process.env[name];
	if (value === undefined || value.trim() === "") return fallback;
	return value;
}

function loadConfig(): AppConfig {
	return {
		port: optionalNumber("PI_NOTIFICATION_RELAY_PORT", 48291),
		host: optionalString("PI_NOTIFICATION_RELAY_HOST", "127.0.0.1"),
		apiKey: requireString("PI_NOTIFICATION_RELAY_API_KEY"),
		nodeEnv: (optionalString("NODE_ENV", "development") as NodeEnv),
	};
}

/** Singleton, validated config — read once at boot. */
export const config: AppConfig = loadConfig();
