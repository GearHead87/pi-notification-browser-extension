export interface ProjectNotification {
	id: string;
	title: string;
	projectName: string;
	projectPath: string;
	model?: string;
	timestamp: number;
}

export type RelayMessage =
	| {
			type: "notify";
			notification: ProjectNotification;
	  }
	| {
			type: "dismiss";
			id?: string;
	  };

export interface RelayStatus {
	/** Both relayUrl and apiKey are set. */
	configured: boolean;
	/** Configured relay URL (may be empty). */
	relayUrl: string;
	/** Whether an API key has been provided. */
	hasApiKey: boolean;
	/** `/ping` succeeded — the process is up. */
	serverReachable: boolean;
	/** `/health` with the configured key succeeded. */
	authorized: boolean;
	/** Background WebSocket is currently OPEN. */
	wsConnected: boolean;
	/** Last error encountered while probing the relay, if any. */
	error: string | null;
	/** Epoch ms when this status was produced. */
	checkedAt: number;
}

export type RuntimeMessage =
	| {
			type: "ensure-connection";
	  }
	| {
			type: "dismiss-notification";
			id: string;
	  }
	| {
			type: "dismiss-all-notifications";
	  }
	| {
			type: "get-relay-status";
	  }
	| {
			type: "open-options-page";
	  };
