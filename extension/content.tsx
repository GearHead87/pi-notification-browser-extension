import type { PlasmoCSConfig } from "plasmo";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ACTIVE_NOTIFICATION_KEY, getActiveNotification } from "./lib/storage";
import type { ProjectNotification, RuntimeMessage } from "./lib/types";

export const config: PlasmoCSConfig = {
	matches: ["http://*/*", "https://*/*"],
	run_at: "document_idle",
};

const HOST_ID = "__pi_notification_overlay_host__";

const overlayCss = `
	:host {
		all: initial;
	}

	*, *::before, *::after {
		box-sizing: border-box;
	}

	.pi-overlay-root {
		position: fixed;
		inset: 0;
		z-index: 2147483647;
		font-family: "SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
	}

	.pi-overlay-backdrop {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 32px;
		background:
			radial-gradient(circle at top, rgba(92, 255, 166, 0.14), transparent 34%),
			radial-gradient(circle at bottom, rgba(96, 165, 250, 0.18), transparent 40%),
			rgba(4, 10, 18, 0.8);
		backdrop-filter: blur(18px) saturate(120%);
		animation: piFadeIn 160ms ease-out;
	}

	.pi-card {
		width: min(720px, 100%);
		padding: 30px;
		border-radius: 28px;
		color: #ecfdf5;
		background: linear-gradient(180deg, rgba(9, 18, 29, 0.96), rgba(8, 14, 24, 0.94));
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow:
			0 30px 80px rgba(0, 0, 0, 0.45),
			0 0 0 1px rgba(92, 255, 166, 0.08) inset;
		transform: translateY(0);
		animation: piRise 220ms ease-out;
	}

	.pi-pill {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 8px 14px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #bbf7d0;
		background: rgba(34, 197, 94, 0.12);
		border: 1px solid rgba(74, 222, 128, 0.2);
	}

	.pi-dot {
		width: 10px;
		height: 10px;
		border-radius: 999px;
		background: #4ade80;
		box-shadow: 0 0 18px rgba(74, 222, 128, 0.8);
	}

	.pi-title {
		margin: 18px 0 8px;
		font-size: clamp(34px, 5vw, 52px);
		line-height: 0.98;
		font-weight: 800;
		letter-spacing: -0.05em;
	}

	.pi-project {
		margin: 0;
		font-size: clamp(20px, 2vw, 26px);
		font-weight: 600;
		color: rgba(236, 253, 245, 0.92);
	}

	.pi-meta-grid {
		margin-top: 22px;
		display: grid;
		gap: 14px;
	}

	.pi-meta-label {
		margin-bottom: 6px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(167, 243, 208, 0.58);
	}

	.pi-meta-value {
		font-size: 15px;
		line-height: 1.6;
		color: rgba(236, 253, 245, 0.88);
		word-break: break-word;
	}

	.pi-actions {
		margin-top: 26px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}

	.pi-hint {
		font-size: 13px;
		color: rgba(220, 252, 231, 0.68);
	}

	.pi-close {
		appearance: none;
		border: 0;
		cursor: pointer;
		padding: 12px 18px;
		border-radius: 999px;
		font-size: 14px;
		font-weight: 700;
		letter-spacing: 0.02em;
		color: #052e16;
		background: linear-gradient(180deg, #86efac, #4ade80);
		box-shadow: 0 10px 28px rgba(34, 197, 94, 0.28);
	}

	.pi-close:hover {
		filter: brightness(1.04);
	}

	@keyframes piFadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes piRise {
		from {
			opacity: 0;
			transform: translateY(12px) scale(0.985);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
`;

function sendRuntimeMessage(message: RuntimeMessage): void {
	chrome.runtime.sendMessage(message, () => {
		void chrome.runtime.lastError;
	});
}

function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
}

function Overlay(): React.JSX.Element | null {
	const [notification, setNotification] = useState<ProjectNotification | null>(null);

	const dismiss = useCallback(() => {
		if (!notification) return;
		sendRuntimeMessage({
			type: "dismiss-notification",
			id: notification.id,
		});
	}, [notification]);

	useEffect(() => {
		sendRuntimeMessage({ type: "ensure-connection" });

		let active = true;
		void getActiveNotification().then((next) => {
			if (active) setNotification(next);
		});

		const handleChange = (
			changes: Record<string, chrome.storage.StorageChange>,
			areaName: string,
		) => {
			if (areaName !== "local" || !(ACTIVE_NOTIFICATION_KEY in changes)) return;
			setNotification((changes[ACTIVE_NOTIFICATION_KEY]?.newValue as ProjectNotification | null | undefined) ?? null);
		};

		chrome.storage.onChanged.addListener(handleChange);
		return () => {
			active = false;
			chrome.storage.onChanged.removeListener(handleChange);
		};
	}, []);

	useEffect(() => {
		if (!notification) return;

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			event.preventDefault();
			event.stopPropagation();
			dismiss();
		};

		window.addEventListener("keydown", handleEscape, true);
		return () => {
			window.removeEventListener("keydown", handleEscape, true);
		};
	}, [dismiss, notification]);

	const finishedAt = useMemo(() => {
		return notification ? formatTime(notification.timestamp) : "";
	}, [notification]);

	if (!notification) return null;

	return (
		<div className="pi-overlay-root">
			<div className="pi-overlay-backdrop" onClick={dismiss}>
				<section className="pi-card" onClick={(event) => event.stopPropagation()}>
					<div className="pi-pill">
						<span className="pi-dot" />
						{notification.title}
					</div>

					<h1 className="pi-title">Project complete</h1>
					<p className="pi-project">{notification.projectName}</p>

					<div className="pi-meta-grid">
						<div>
							<div className="pi-meta-label">Path</div>
							<div className="pi-meta-value">{notification.projectPath}</div>
						</div>

						{notification.model ? (
							<div>
								<div className="pi-meta-label">Model</div>
								<div className="pi-meta-value">{notification.model}</div>
							</div>
						) : null}

						<div>
							<div className="pi-meta-label">Finished</div>
							<div className="pi-meta-value">{finishedAt}</div>
						</div>
					</div>

					<div className="pi-actions">
						<div className="pi-hint">Press Esc or close once to dismiss this overlay in every tab.</div>
						<button className="pi-close" type="button" onClick={dismiss}>
							Close everywhere
						</button>
					</div>
				</section>
			</div>
		</div>
	);
}

function mount(): void {
	if (document.getElementById(HOST_ID)) return;

	const host = document.createElement("div");
	host.id = HOST_ID;

	const shadowRoot = host.attachShadow({ mode: "open" });
	const style = document.createElement("style");
	style.textContent = overlayCss;
	shadowRoot.appendChild(style);

	const rootElement = document.createElement("div");
	shadowRoot.appendChild(rootElement);

	document.documentElement.appendChild(host);
	createRoot(rootElement).render(<Overlay />);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
	mount();
}

export {};
