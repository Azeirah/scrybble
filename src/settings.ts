import {ScrybbleSettings} from "../@types/scrybble";
import {App, Notice, PluginSettingTab, Setting} from "obsidian";
import {fetchOAuthToken} from "./sync";
import Scrybble from "../main";

export const DEFAULT_SETTINGS: ScrybbleSettings = {
	last_successful_sync_id: -1,
	sync_folder: "scrybble"
}

export function getAccessToken(): string | null {
	return localStorage.getItem('scrybble_access_token');
}

export class Settings extends PluginSettingTab {
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
				.setName('Output folder')
				.setDesc('Folder where your synchronized files will be stored.')
				.addText((text) => text
					.setValue(this.plugin.settings.sync_folder)
					.onChange((value) => {
						this.plugin.settings.sync_folder = value;
						this.plugin.saveSettings();
					}));

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
