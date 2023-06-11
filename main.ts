import {App, ButtonComponent, Modal, Notice, Plugin, Setting} from 'obsidian';
import {fetchSyncDelta, synchronize} from "./src/sync";
import {ScrybbleSettings} from "./@types/scrybble";
import {DEFAULT_SETTINGS, getAccessToken, Settings} from "./src/settings";

class SyncHistoryModal extends Modal {
	private plugin: Scrybble;

	constructor(app: App, plugin: Scrybble) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.createEl("h1", {text: "Scrybble sync history"});

		new Setting(contentEl)
			.setName("Coming soon")
			.setDesc("An overview of your synchronizations will be shown here in a future update.");

		new Setting(contentEl)
			.addButton(button => {
				button.setCta()
				button.setButtonText('Check for new files now');
				button.onClick(() => {
					this.plugin.sync();
				});
			});
	}

	onClose() {

	}
}

export default class Scrybble extends Plugin {
	// @ts-ignore -- onload acts as a constructor.
	settings: ScrybbleSettings;

	async onload() {
		this.addSettingTab(new Settings(this.app, this));

		const syncHistory = this.addStatusBarItem();
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

