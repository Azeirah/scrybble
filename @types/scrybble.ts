export interface Host {
	endpoint: string;
	client_secret: string;
}

export interface ScrybbleSettings {
	last_successful_sync_id: number;
	sync_folder: string;

	self_hosted: boolean;

	custom_host: Host;
}

export type SyncDelta = { id: number, download_url: string, filename: string };
