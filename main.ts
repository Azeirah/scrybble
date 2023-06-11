import {App, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {fetchOAuthToken, fetchSyncDelta, synchronize} from "./src/sync";
import {ScrybbleSettings} from "./@types/scrybble";

const DEFAULT_SETTINGS: ScrybbleSettings = {
	last_successful_sync_id: -1
}

function getAccessToken(): string | null {
	return localStorage.getItem('scrybble_access_token');
}

export default class Scrybble extends Plugin {
	// @ts-ignore -- onload acts as a constructor.
	settings: ScrybbleSettings;

	async onload() {
		this.addSettingTab(new Settings(this.app, this));
		this.app.workspace.onLayoutReady(this.sync.bind(this));
	}

	async sync() {
		const token = getAccessToken();
		const settings = await this.loadSettings();

		if (token !== null) {
			try {
				const json = await fetchSyncDelta(token);
				const new_last_sync_id = await synchronize(json, settings.last_successful_sync_id);

				if (new_last_sync_id) {
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

class Settings extends PluginSettingTab {
	plugin: Scrybble;

	constructor(app: App, plugin: Scrybble) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		const access_token = getAccessToken();

		let password = "";
		let username = "";

		containerEl.empty();
		containerEl.createEl('h2', {text: 'Sync ReMarkable notes'});

		if (access_token === null) {
			new Setting(containerEl)
				.setName('Login')
				.setDesc('Login details')
				.addText(text => text
					.setPlaceholder('Enter your username')
					.onChange((value) => {
						username = value;
					}))
				.addText(text => {
					text.setPlaceholder('Enter your password');
					text.inputEl.setAttribute('type', 'password');
					text.onChange((value) => {
						password = value;
					});
				})
				.addButton((button) => {
					button.setButtonText('Log in');
					button.onClick(async () => {
						try {
							const {access_token} = await fetchOAuthToken(username, password);
							localStorage.setItem('scrybble_access_token', access_token);
						} catch (error) {
							new Notice("Scrybble: Failed to log in, check your username and password")
							console.error(error);
						}
					});
				});
		} else {
			new Setting(containerEl)
				.setName('Log out')
				.setDesc('You are currently logged in')
				.addButton((button) => {
					button.setButtonText('Log out');
					button.onClick(async () => {
						localStorage.removeItem('scrybble_access_token');
					});
				});

			new Setting(containerEl)
				.setName('Manual synchronization')
				.addButton((button) => {
					button.setButtonText('Go');
					button.onClick(() => {
						this.plugin.sync();
					})
				})
		}

	}
}
