export interface ScrybbleSettings {
	last_successful_sync_id: number;
	sync_folder: string;
}

export type SyncDelta = { id: number, download_url: string, filename: string };
