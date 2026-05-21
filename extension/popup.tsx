import React, { useCallback, useEffect, useState } from "react";
import type { RelayStatus, RuntimeMessage } from "./lib/types";

function dotStyle(color: string): React.CSSProperties {
	return {
		width: 10,
		height: 10,
		borderRadius: 999,
		background: color,
		boxShadow: `0 0 10px ${color}88`,
		flexShrink: 0,
	};
}

const styles: Record<string, React.CSSProperties> = {
	root: {
		width: 320,
		padding: 16,
		fontFamily:
			'"SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
		background: "linear-gradient(180deg, #0b1320, #060b14)",
		color: "#ecfdf5",
		boxSizing: "border-box",
	},
	header: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 14,
	},
	title: {
		fontSize: 14,
		fontWeight: 700,
		letterSpacing: "-0.01em",
	},
	iconButton: {
		appearance: "none",
		border: "1px solid rgba(255,255,255,0.12)",
		background: "rgba(255,255,255,0.04)",
		color: "#ecfdf5",
		cursor: "pointer",
		width: 32,
		height: 32,
		borderRadius: 10,
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		transition: "background-color 120ms ease",
	},
	statusCard: {
		padding: 14,
		borderRadius: 14,
		border: "1px solid rgba(255,255,255,0.08)",
		background:
			"linear-gradient(180deg, rgba(15,28,42,0.96), rgba(10,20,32,0.94))",
	},
	statusRow: {
		display: "flex",
		alignItems: "center",
		gap: 10,
		marginBottom: 10,
	},

	statusLabel: { fontSize: 13, fontWeight: 700 },
	meta: {
		fontSize: 11,
		color: "rgba(220,252,231,0.6)",
		lineHeight: 1.5,
		wordBreak: "break-all",
	},
	metaRow: {
		display: "flex",
		justifyContent: "space-between",
		gap: 12,
		marginTop: 6,
	},
	metaKey: {
		fontSize: 10,
		fontWeight: 700,
		letterSpacing: "0.14em",
		textTransform: "uppercase",
		color: "rgba(167,243,208,0.55)",
	},
	errorBox: {
		marginTop: 10,
		padding: "8px 10px",
		borderRadius: 10,
		fontSize: 11,
		background: "rgba(248,113,113,0.12)",
		border: "1px solid rgba(248,113,113,0.3)",
		color: "#fecaca",
	},
	footer: {
		marginTop: 14,
		display: "flex",
		gap: 8,
	},
	button: {
		flex: 1,
		appearance: "none",
		cursor: "pointer",
		border: "1px solid rgba(74,222,128,0.32)",
		background: "rgba(34,197,94,0.14)",
		color: "#bbf7d0",
		padding: "8px 12px",
		borderRadius: 10,
		fontSize: 12,
		fontWeight: 700,
		letterSpacing: "0.05em",
		textTransform: "uppercase",
	},
	buttonSecondary: {
		flex: 1,
		appearance: "none",
		cursor: "pointer",
		border: "1px solid rgba(255,255,255,0.12)",
		background: "rgba(255,255,255,0.04)",
		color: "#ecfdf5",
		padding: "8px 12px",
		borderRadius: 10,
		fontSize: 12,
		fontWeight: 700,
		letterSpacing: "0.05em",
		textTransform: "uppercase",
	},
};

function GearIcon(): React.JSX.Element {
	return (
		<svg
			viewBox="0 0 24 24"
			width="16"
			height="16"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
		</svg>
	);
}

type Verdict = {
	color: string;
	label: string;
	hint: string;
};

function deriveVerdict(status: RelayStatus | null): Verdict {
	if (!status) {
		return {
			color: "#94a3b8",
			label: "Checking…",
			hint: "Probing the relay server.",
		};
	}

	if (!status.relayUrl) {
		return {
			color: "#fbbf24",
			label: "Not configured",
			hint: "Set a relay URL in settings.",
		};
	}

	if (!status.serverReachable) {
		return {
			color: "#f87171",
			label: "Offline",
			hint: status.error ?? "The relay server is unreachable.",
		};
	}

	if (!status.hasApiKey) {
		return {
			color: "#fbbf24",
			label: "Missing API key",
			hint: "Add your x-api-key in settings.",
		};
	}

	if (!status.authorized) {
		return {
			color: "#f87171",
			label: "Unauthorized",
			hint: status.error ?? "Relay rejected the API key.",
		};
	}

	if (!status.wsConnected) {
		return {
			color: "#fbbf24",
			label: "Connecting…",
			hint: "Server reachable, WebSocket not connected yet.",
		};
	}

	return {
		color: "#4ade80",
		label: "Connected",
		hint: "Relay is online and listening.",
	};
}

function sendMessage<T = unknown>(message: RuntimeMessage): Promise<T> {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage(message, (response: T) => {
			void chrome.runtime.lastError;
			resolve(response);
		});
	});
}

function Popup(): React.JSX.Element {
	const [status, setStatus] = useState<RelayStatus | null>(null);
	const [loading, setLoading] = useState<boolean>(true);

	const refresh = useCallback(async () => {
		setLoading(true);
		const next = await sendMessage<RelayStatus | undefined>({
			type: "get-relay-status",
		});
		setStatus(next ?? null);
		setLoading(false);
	}, []);

	useEffect(() => {
		void refresh();
		const interval = setInterval(() => {
			void refresh();
		}, 5000);
		return () => clearInterval(interval);
	}, [refresh]);

	const openSettings = useCallback(() => {
		void sendMessage({ type: "open-options-page" });
		window.close();
	}, []);

	const verdict = deriveVerdict(status);

	return (
		<div style={styles.root}>
			<header style={styles.header}>
				<div style={styles.title}>Pi Notification Overlay</div>
				<button
					type="button"
					title="Open settings"
					aria-label="Open settings"
					style={styles.iconButton}
					onClick={openSettings}
				>
					<GearIcon />
				</button>
			</header>

			<section style={styles.statusCard}>
				<div style={styles.statusRow}>
					<span style={dotStyle(verdict.color)} />
					<span style={styles.statusLabel}>{verdict.label}</span>
				</div>

				<div style={styles.meta}>{verdict.hint}</div>

				<div style={styles.metaRow}>
					<span style={styles.metaKey}>Relay URL</span>
					<span style={{ ...styles.meta, textAlign: "right" }}>
						{status?.relayUrl || "—"}
					</span>
				</div>

				<div style={styles.metaRow}>
					<span style={styles.metaKey}>API key</span>
					<span style={{ ...styles.meta, textAlign: "right" }}>
						{status?.hasApiKey ? "set" : "not set"}
					</span>
				</div>

				<div style={styles.metaRow}>
					<span style={styles.metaKey}>WebSocket</span>
					<span style={{ ...styles.meta, textAlign: "right" }}>
						{status?.wsConnected ? "open" : "closed"}
					</span>
				</div>

				{status?.error && !verdict.label.includes("Connected") ? (
					<div style={styles.errorBox}>{status.error}</div>
				) : null}
			</section>

			<footer style={styles.footer}>
				<button
					type="button"
					style={styles.buttonSecondary}
					onClick={() => void refresh()}
					disabled={loading}
				>
					{loading ? "Checking…" : "Refresh"}
				</button>
				<button type="button" style={styles.button} onClick={openSettings}>
					Settings
				</button>
			</footer>
		</div>
	);
}

export default Popup;
