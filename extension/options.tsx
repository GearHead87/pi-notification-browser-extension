import React, { useCallback, useEffect, useState } from "react";
import {
	DEFAULT_SETTINGS,
	getSettings,
	setSettings,
	type ExtensionSettings,
} from "./lib/settings";

const styles: Record<string, React.CSSProperties> = {
	page: {
		minHeight: "100vh",
		margin: 0,
		padding: "48px 24px",
		fontFamily:
			'"SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
		background:
			"radial-gradient(circle at top, rgba(92,255,166,0.10), transparent 40%), radial-gradient(circle at bottom, rgba(96,165,250,0.12), transparent 45%), #060b14",
		color: "#ecfdf5",
		boxSizing: "border-box",
	},
	container: {
		maxWidth: 640,
		margin: "0 auto",
	},
	header: {
		marginBottom: 28,
	},
	title: {
		fontSize: 24,
		fontWeight: 800,
		letterSpacing: "-0.02em",
		margin: 0,
	},
	subtitle: {
		marginTop: 6,
		fontSize: 13,
		color: "rgba(220,252,231,0.65)",
		lineHeight: 1.6,
	},
	card: {
		padding: 22,
		borderRadius: 18,
		border: "1px solid rgba(255,255,255,0.08)",
		background:
			"linear-gradient(180deg, rgba(15,28,42,0.96), rgba(10,20,32,0.94))",
		boxShadow: "0 18px 50px rgba(0,0,0,0.4)",
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: 800,
		letterSpacing: "0.16em",
		textTransform: "uppercase",
		color: "rgba(167,243,208,0.6)",
		marginBottom: 14,
	},
	field: {
		display: "flex",
		flexDirection: "column",
		gap: 6,
		marginBottom: 16,
	},
	label: {
		fontSize: 12,
		fontWeight: 700,
		color: "#ecfdf5",
	},
	hint: {
		fontSize: 11,
		color: "rgba(220,252,231,0.55)",
		lineHeight: 1.5,
	},
	input: {
		appearance: "none",
		width: "100%",
		padding: "10px 12px",
		borderRadius: 10,
		border: "1px solid rgba(255,255,255,0.12)",
		background: "rgba(4,10,18,0.65)",
		color: "#ecfdf5",
		fontSize: 13,
		fontFamily:
			'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
		boxSizing: "border-box",
		outline: "none",
	},
	row: {
		display: "flex",
		gap: 10,
		alignItems: "center",
		marginTop: 18,
	},
	primaryBtn: {
		appearance: "none",
		cursor: "pointer",
		border: "1px solid rgba(74,222,128,0.4)",
		background: "linear-gradient(180deg, #86efac, #4ade80)",
		color: "#052e16",
		padding: "10px 18px",
		borderRadius: 10,
		fontSize: 13,
		fontWeight: 800,
		letterSpacing: "0.04em",
		textTransform: "uppercase",
	},
	secondaryBtn: {
		appearance: "none",
		cursor: "pointer",
		border: "1px solid rgba(255,255,255,0.12)",
		background: "rgba(255,255,255,0.04)",
		color: "#ecfdf5",
		padding: "10px 18px",
		borderRadius: 10,
		fontSize: 13,
		fontWeight: 700,
		letterSpacing: "0.04em",
		textTransform: "uppercase",
	},
	statusOk: {
		marginLeft: "auto",
		fontSize: 12,
		color: "#86efac",
		fontWeight: 700,
	},
	statusErr: {
		marginLeft: "auto",
		fontSize: 12,
		color: "#fca5a5",
		fontWeight: 700,
	},
};

type SaveState =
	| { kind: "idle" }
	| { kind: "saving" }
	| { kind: "saved" }
	| { kind: "error"; message: string };

function isValidHttpUrl(value: string): boolean {
	try {
		const parsed = new URL(value);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

function Options(): React.JSX.Element {
	const [settings, setLocalSettings] = useState<ExtensionSettings>({
		...DEFAULT_SETTINGS,
	});
	const [loaded, setLoaded] = useState(false);
	const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });

	useEffect(() => {
		void (async () => {
			const next = await getSettings();
			setLocalSettings(next);
			setLoaded(true);
		})();
	}, []);

	const update = useCallback(
		<K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => {
			setLocalSettings((prev) => ({ ...prev, [key]: value }));
			setSaveState({ kind: "idle" });
		},
		[],
	);

	const handleSave = useCallback(async () => {
		if (!isValidHttpUrl(settings.relayUrl.trim())) {
			setSaveState({
				kind: "error",
				message: "Relay URL must be a valid http:// or https:// URL.",
			});
			return;
		}

		setSaveState({ kind: "saving" });
		try {
			await setSettings(settings);
			setSaveState({ kind: "saved" });
			setTimeout(() => {
				setSaveState((curr) => (curr.kind === "saved" ? { kind: "idle" } : curr));
			}, 2000);
		} catch (error) {
			setSaveState({
				kind: "error",
				message: error instanceof Error ? error.message : "Failed to save",
			});
		}
	}, [settings]);

	const handleResetDefaults = useCallback(() => {
		setLocalSettings({ ...DEFAULT_SETTINGS });
		setSaveState({ kind: "idle" });
	}, []);

	if (!loaded) {
		return (
			<div style={styles.page}>
				<div style={styles.container}>Loading…</div>
			</div>
		);
	}

	return (
		<div style={styles.page}>
			<div style={styles.container}>
				<header style={styles.header}>
					<h1 style={styles.title}>Pi Notification Overlay — Settings</h1>
					<p style={styles.subtitle}>
						Configure the relay server the extension should listen to. These
						values are stored in your browser; they are <strong>not</strong>{" "}
						read from any <code>.env</code> file.
					</p>
				</header>

				<section style={styles.card}>
					<div style={styles.sectionTitle}>Relay connection</div>

					<div style={styles.field}>
						<label style={styles.label} htmlFor="relayUrl">
							Relay URL
						</label>
						<input
							id="relayUrl"
							style={styles.input}
							type="url"
							placeholder={DEFAULT_SETTINGS.relayUrl}
							value={settings.relayUrl}
							onChange={(event) => update("relayUrl", event.target.value)}
							spellCheck={false}
							autoComplete="off"
						/>
						<div style={styles.hint}>
							Base URL of the relay server. Defaults to{" "}
							<code>{DEFAULT_SETTINGS.relayUrl}</code> for local development.
							Point this at your own host (e.g. <code>https://relay.example.com</code>)
							when running remotely.
						</div>
					</div>

					<div style={styles.field}>
						<label style={styles.label} htmlFor="apiKey">
							x-api-key
						</label>
						<input
							id="apiKey"
							style={styles.input}
							type="password"
							placeholder="Required — paste your relay API key"
							value={settings.apiKey}
							onChange={(event) => update("apiKey", event.target.value)}
							spellCheck={false}
							autoComplete="off"
						/>
						<div style={styles.hint}>
							The extension sends this as the <code>x-api-key</code> header (and
							as <code>?api_key=</code> on the WebSocket handshake, since
							browsers can't set custom headers there). Must match the key the
							relay was started with. Leave empty and the extension will stay
							disconnected.
						</div>
					</div>

					<div style={styles.row}>
						<button
							type="button"
							style={styles.primaryBtn}
							onClick={() => void handleSave()}
							disabled={saveState.kind === "saving"}
						>
							{saveState.kind === "saving" ? "Saving…" : "Save settings"}
						</button>
						<button
							type="button"
							style={styles.secondaryBtn}
							onClick={handleResetDefaults}
						>
							Reset defaults
						</button>

						{saveState.kind === "saved" ? (
							<span style={styles.statusOk}>Saved ✓</span>
						) : null}
						{saveState.kind === "error" ? (
							<span style={styles.statusErr}>{saveState.message}</span>
						) : null}
					</div>
				</section>
			</div>
		</div>
	);
}

export default Options;
