import type { ProjectNotification } from "./types";

export const ACTIVE_NOTIFICATIONS_KEY = "piActiveNotifications";

/** Legacy single-notification key from the previous version. Cleaned up on first read. */
const LEGACY_KEY = "piActiveNotification";

export function getActiveNotifications(): Promise<ProjectNotification[]> {
	return new Promise((resolve) => {
		chrome.storage.local.get([ACTIVE_NOTIFICATIONS_KEY, LEGACY_KEY], (result) => {
			const list = (result?.[ACTIVE_NOTIFICATIONS_KEY] as ProjectNotification[] | undefined) ?? [];

			// One-time migration from the old single-value key.
			const legacy = result?.[LEGACY_KEY] as ProjectNotification | null | undefined;
			if (legacy) {
				const merged = mergeNotification(list, legacy);
				chrome.storage.local.set({ [ACTIVE_NOTIFICATIONS_KEY]: merged });
				chrome.storage.local.remove(LEGACY_KEY);
				resolve(merged);
				return;
			}

			resolve(list);
		});
	});
}

export function setActiveNotifications(list: ProjectNotification[]): Promise<void> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.set({ [ACTIVE_NOTIFICATIONS_KEY]: list }, () => {
			if (chrome.runtime.lastError) {
				reject(new Error(chrome.runtime.lastError.message));
				return;
			}
			resolve();
		});
	});
}

export async function addNotification(notification: ProjectNotification): Promise<ProjectNotification[]> {
	const current = await getActiveNotifications();
	const next = mergeNotification(current, notification);
	await setActiveNotifications(next);
	return next;
}

export async function removeNotification(id: string): Promise<ProjectNotification[]> {
	const current = await getActiveNotifications();
	const next = current.filter((item) => item.id !== id);
	await setActiveNotifications(next);
	return next;
}

export async function clearNotifications(): Promise<void> {
	await setActiveNotifications([]);
}

/** Insert newest-first, dedupe by id (later wins). */
function mergeNotification(
	list: ProjectNotification[],
	notification: ProjectNotification,
): ProjectNotification[] {
	const without = list.filter((item) => item.id !== notification.id);
	return [notification, ...without];
}
