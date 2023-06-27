import {Notice, Plugin} from 'obsidian';
import {fetchSyncDelta, synchronize} from "./src/sync";
import {ScrybbleSettings} from "./@types/scrybble";
import {DEFAULT_SETTINGS, getAccessToken, Settings} from "./src/settings";
import {SyncHistoryModal} from "./src/SyncHistoryModal";

export default class Scrybble extends Plugin {
	// @ts-ignore -- onload acts as a constructor.
	settings: ScrybbleSettings;

	async onload() {
		this.addSettingTab(new Settings(this.app, this));

		const syncHistory = this.addStatusBarItem();
		syncHistory.addClass("mod-clickable");
		syncHistory.setText("Scrybble");
		syncHistory.onClickEvent(() => {
			new SyncHistoryModal(this.app, this).open();
		});

		this.app.workspace.onLayoutReady(this.sync.bind(this));
	}

	async sync() {
		const token = getAccessToken();
		const settings = await this.loadSettings();

		if (token !== null) {
			try {
				const json = await fetchSyncDelta(token);

				for await (const new_last_sync_id of synchronize(json, settings.last_successful_sync_id, settings.sync_folder)) {
					this.settings.last_successful_sync_id = new_last_sync_id;
					this.saveSettings();
				}
			} catch (e) {
				new Notice("Scrybble: Failed to synchronize. Are you logged in?");
				console.error(e);
				return;
			}
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		return this.settings as ScrybbleSettings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

