import type { ProjectNotification } from "../types/index.js";

/**
 * In-memory store for the single "active" notification. The original relay
 * was deliberately simple — only the most recent project completion is held
 * here and pushed to connected clients. Encapsulating it as a class makes
 * it easy to later swap for Redis / SQLite / etc. without touching routes.
 */
class NotificationStore {
	private active: ProjectNotification | null = null;

	get(): ProjectNotification | null {
		return this.active;
	}

	set(notification: ProjectNotification): void {
		this.active = notification;
	}

	/**
	 * Clear the active notification.
	 *
	 * If an `id` is provided we only clear when it matches (or when nothing
	 * is currently active — kept for parity with the original behaviour
	 * which treated mismatched IDs as a successful no-op).
	 */
	clear(id?: string): { cleared: boolean; previousId: string | undefined } {
		const currentId = this.active?.id;
		if (!id || !currentId || id === currentId) {
			this.active = null;
			return { cleared: true, previousId: currentId };
		}
		return { cleared: false, previousId: currentId };
	}
}

export const notificationStore = new NotificationStore();

/**
 * Coerce a loose payload from the HTTP body into a valid `ProjectNotification`.
 * Throws if the minimum required fields (`id`, `projectPath`) are missing.
 */
export function normalizeNotification(
	input: Partial<ProjectNotification>,
): ProjectNotification {
	if (!input.id || !input.projectPath) {
		throw new Error(
			"Notification payload must include at least id and projectPath",
		);
	}

	return {
		id: String(input.id),
		title: input.title ? String(input.title) : "Task complete",
		projectName: input.projectName
			? String(input.projectName)
			: String(input.projectPath),
		projectPath: String(input.projectPath),
		model: input.model ? String(input.model) : undefined,
		timestamp: Number(input.timestamp ?? Date.now()),
	};
}
