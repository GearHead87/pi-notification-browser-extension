import type {
	PlasmoCSConfig,
	PlasmoGetShadowHostId,
	PlasmoGetStyle,
} from "plasmo";
import React, { useCallback, useEffect, useState } from "react";
import { ACTIVE_NOTIFICATIONS_KEY, getActiveNotifications } from "./lib/storage";
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
		pointer-events: none;
	}

	.pi-overlay-backdrop {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: flex-start;
		justify-content: flex-end;
		padding: 20px;
		background: transparent;
		animation: piFadeIn 160ms ease-out;
		pointer-events: none;
	}

	.pi-panel {
		width: min(520px, calc(100vw - 40px));
		max-height: min(72vh, 760px);
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 22px 22px 18px;
		border-radius: 18px;
		color: #ecfdf5;
		background: linear-gradient(180deg, rgba(9, 18, 29, 0.96), rgba(8, 14, 24, 0.94));
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow:
			0 30px 80px rgba(0, 0, 0, 0.45),
			0 0 0 1px rgba(92, 255, 166, 0.08) inset;
		animation: piRise 220ms ease-out;
		pointer-events: auto;
	}

	.pi-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 4px 4px 2px;
	}

	.pi-panel-title {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 18px;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: #ecfdf5;
	}

	.pi-panel-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 26px;
		height: 24px;
		padding: 0 8px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 800;
		color: #052e16;
		background: linear-gradient(180deg, #86efac, #4ade80);
		box-shadow: 0 6px 18px rgba(34, 197, 94, 0.32);
	}

	.pi-dismiss-all {
		appearance: none;
		border: 1px solid rgba(248, 113, 113, 0.32);
		cursor: pointer;
		padding: 8px 14px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #fecaca;
		background: rgba(248, 113, 113, 0.12);
		transition: background-color 120ms ease, color 120ms ease;
	}

	.pi-dismiss-all:hover {
		background: rgba(248, 113, 113, 0.22);
		color: #fff1f2;
	}

	.pi-stack {
		display: flex;
		flex-direction: column;
		gap: 12px;
		overflow-y: auto;
		padding: 4px;
		margin: -4px;
	}

	.pi-stack::-webkit-scrollbar {
		width: 8px;
	}
	.pi-stack::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 999px;
	}

	.pi-card {
		position: relative;
		padding: 18px 20px 18px 20px;
		border-radius: 20px;
		background: linear-gradient(180deg, rgba(15, 28, 42, 0.96), rgba(10, 20, 32, 0.94));
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
		animation: piRise 180ms ease-out;
	}

	.pi-card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.pi-pill {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 6px 12px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #bbf7d0;
		background: rgba(34, 197, 94, 0.12);
		border: 1px solid rgba(74, 222, 128, 0.2);
	}

	.pi-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: #4ade80;
		box-shadow: 0 0 14px rgba(74, 222, 128, 0.8);
	}

	.pi-card-close {
		appearance: none;
		border: 0;
		cursor: pointer;
		width: 32px;
		height: 32px;
		border-radius: 10px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: rgba(252, 165, 165, 0.92);
		background: rgba(248, 113, 113, 0.1);
		transition: background-color 120ms ease, color 120ms ease, transform 120ms ease;
	}

	.pi-card-close:hover {
		background: rgba(248, 113, 113, 0.22);
		color: #fff1f2;
		transform: scale(1.04);
	}

	.pi-card-close svg {
		width: 16px;
		height: 16px;
	}

	.pi-project {
		margin: 14px 0 4px;
		font-size: clamp(20px, 2.2vw, 28px);
		line-height: 1.1;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: #ecfdf5;
		word-break: break-word;
	}

	.pi-meta-grid {
		margin-top: 10px;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px 18px;
	}

	.pi-meta-label {
		margin-bottom: 4px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(167, 243, 208, 0.55);
	}

	.pi-meta-value {
		font-size: 13px;
		line-height: 1.5;
		color: rgba(236, 253, 245, 0.88);
		word-break: break-word;
	}

	.pi-hint {
		padding: 4px 4px 0;
		font-size: 12px;
		color: rgba(220, 252, 231, 0.6);
		text-align: center;
	}

	.pi-hint kbd {
		display: inline-block;
		padding: 1px 6px;
		margin: 0 2px;
		border-radius: 6px;
		font-family: inherit;
		font-size: 11px;
		font-weight: 700;
		color: #ecfdf5;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	@keyframes piFadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes piRise {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.985);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
`;

export const getStyle: PlasmoGetStyle = () => {
	const style = document.createElement("style");
	style.textContent = overlayCss;
	return style;
};

export const getShadowHostId: PlasmoGetShadowHostId = () => HOST_ID;

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

function CloseIcon(): React.JSX.Element {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
			<line x1="6" y1="6" x2="18" y2="18" />
			<line x1="18" y1="6" x2="6" y2="18" />
		</svg>
	);
}

function NotificationCard({
	notification,
	onDismiss,
}: {
	notification: ProjectNotification;
	onDismiss: (id: string) => void;
}): React.JSX.Element {
	return (
		<article className="pi-card">
			<div className="pi-card-head">
				<div className="pi-pill">
					<span className="pi-dot" />
					{notification.title}
				</div>
				<button
					className="pi-card-close"
					type="button"
					aria-label={`Dismiss ${notification.projectName}`}
					title="Dismiss this notification"
					onClick={() => onDismiss(notification.id)}
				>
					<CloseIcon />
				</button>
			</div>

			<h2 className="pi-project">{notification.projectName}</h2>

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
					<div className="pi-meta-value">{formatTime(notification.timestamp)}</div>
				</div>
			</div>
		</article>
	);
}

function Overlay(): React.JSX.Element | null {
	const [notifications, setNotifications] = useState<ProjectNotification[]>([]);

	const dismissOne = useCallback((id: string) => {
		sendRuntimeMessage({ type: "dismiss-notification", id });
	}, []);

	const dismissAll = useCallback(() => {
		sendRuntimeMessage({ type: "dismiss-all-notifications" });
	}, []);

	useEffect(() => {
		sendRuntimeMessage({ type: "ensure-connection" });

		let active = true;
		void getActiveNotifications().then((list) => {
			console.debug("[pi-overlay] initial notifications =", list.length);
			if (active) setNotifications(list);
		});

		const handleChange = (
			changes: Record<string, chrome.storage.StorageChange>,
			areaName: string,
		) => {
			if (areaName !== "local" || !(ACTIVE_NOTIFICATIONS_KEY in changes)) return;
			const next = (changes[ACTIVE_NOTIFICATIONS_KEY]?.newValue as ProjectNotification[] | undefined) ?? [];
			console.debug("[pi-overlay] storage change → count:", next.length);
			setNotifications(next);
		};

		chrome.storage.onChanged.addListener(handleChange);
		return () => {
			active = false;
			chrome.storage.onChanged.removeListener(handleChange);
		};
	}, []);

	useEffect(() => {
		if (notifications.length === 0) return;

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			event.preventDefault();
			event.stopPropagation();
			dismissAll();
		};

		window.addEventListener("keydown", handleEscape, true);
		return () => {
			window.removeEventListener("keydown", handleEscape, true);
		};
	}, [dismissAll, notifications.length]);

	if (notifications.length === 0) return null;

	const count = notifications.length;

	return (
		<div className="pi-overlay-root">
			<div className="pi-overlay-backdrop">
				<section className="pi-panel" onClick={(event) => event.stopPropagation()}>
					<header className="pi-panel-header">
						<div className="pi-panel-title">
							<span className="pi-panel-count">{count}</span>
							{count === 1 ? "Project ready" : "Projects ready"}
						</div>
						<button
							className="pi-dismiss-all"
							type="button"
							onClick={dismissAll}
							title="Dismiss every notification (Esc)"
						>
							Dismiss all
						</button>
					</header>

					<div className="pi-stack">
						{notifications.map((notification) => (
							<NotificationCard
								key={notification.id}
								notification={notification}
								onDismiss={dismissOne}
							/>
						))}
					</div>

					<div className="pi-hint">
						Press <kbd>Esc</kbd> to clear all · click <kbd>×</kbd> on a card to dismiss just that one
					</div>
				</section>
			</div>
		</div>
	);
}

export default Overlay;
