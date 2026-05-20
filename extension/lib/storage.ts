import type { ProjectNotification } from "./types";

export const ACTIVE_NOTIFICATION_KEY = "piActiveNotification";

export function getActiveNotification(): Promise<ProjectNotification | null> {
	return new Promise((resolve) => {
		chrome.storage.local.get([ACTIVE_NOTIFICATION_KEY], (result) => {
			resolve((result?.[ACTIVE_NOTIFICATION_KEY] as ProjectNotification | null | undefined) ?? null);
		});
	});
}

export function setActiveNotification(notification: ProjectNotification | null): Promise<void> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.set({ [ACTIVE_NOTIFICATION_KEY]: notification }, () => {
			if (chrome.runtime.lastError) {
				reject(new Error(chrome.runtime.lastError.message));
				return;
			}
			resolve();
		});
	});
}
