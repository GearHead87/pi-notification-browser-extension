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
