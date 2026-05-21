/**
 * Extension settings persisted in `chrome.storage.local`.
 *
 * The object is intentionally shaped so new fields can be added later
 * (e.g. sound, theme, notification behaviour) without breaking older
 * stored payloads — unknown fields are ignored, missing fields fall
 * back to the defaults in `DEFAULT_SETTINGS`.
 */

export interface ExtensionSettings {
	/** Base HTTP(S) URL of the relay server, e.g. `http://127.0.0.1:48293`. */
	relayUrl: string;
	/** Value sent as the `x-api-key` header / `api_key` query param. */
	apiKey: string;
}

export const SETTINGS_KEY = "piExtensionSettings";

export const DEFAULT_SETTINGS: ExtensionSettings = {
	relayUrl: "http://127.0.0.1:48293",
	apiKey: "",
};

export function getSettings(): Promise<ExtensionSettings> {
	return new Promise((resolve) => {
		chrome.storage.local.get([SETTINGS_KEY], (result) => {
			const stored = result?.[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined;
			resolve(mergeWithDefaults(stored));
		});
	});
}

export function setSettings(settings: ExtensionSettings): Promise<void> {
	return new Promise((resolve, reject) => {
		const normalized: ExtensionSettings = {
			relayUrl: (settings.relayUrl ?? "").trim() || DEFAULT_SETTINGS.relayUrl,
			apiKey: (settings.apiKey ?? "").trim(),
		};

		chrome.storage.local.set({ [SETTINGS_KEY]: normalized }, () => {
			if (chrome.runtime.lastError) {
				reject(new Error(chrome.runtime.lastError.message));
				return;
			}
			resolve();
		});
	});
}

export function onSettingsChanged(
	listener: (next: ExtensionSettings) => void,
): () => void {
	const handler = (
		changes: Record<string, chrome.storage.StorageChange>,
		areaName: string,
	) => {
		if (areaName !== "local" || !(SETTINGS_KEY in changes)) return;
		const next = changes[SETTINGS_KEY]?.newValue as Partial<ExtensionSettings> | undefined;
		listener(mergeWithDefaults(next));
	};

	chrome.storage.onChanged.addListener(handler);
	return () => chrome.storage.onChanged.removeListener(handler);
}

function mergeWithDefaults(
	stored: Partial<ExtensionSettings> | undefined,
): ExtensionSettings {
	return {
		...DEFAULT_SETTINGS,
		...(stored ?? {}),
	};
}

/** Normalize a relay base URL (trim trailing slash). Returns "" if invalid. */
export function normalizeRelayUrl(raw: string): string {
	const trimmed = (raw ?? "").trim();
	if (!trimmed) return "";
	return trimmed.replace(/\/+$/, "");
}

/** Convert an HTTP(S) relay URL into its ws(s):// equivalent. */
export function relayHttpToWs(httpUrl: string): string {
	return httpUrl.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");
}
