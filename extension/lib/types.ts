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
	  };
