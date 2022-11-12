import * as jszip from 'jszip';
import {App, Notice, Plugin, PluginSettingTab, requestUrl, Setting} from 'obsidian';

const base_url = "http://rmnotesynclaravel-env.eba-3h3bny9s.eu-central-1.elasticbeanstalk.com";

interface ScrybbleSettings {
	access_token?: string;
	last_successful_sync_id: number;
}

const DEFAULT_SETTINGS: ScrybbleSettings = {
	access_token: null,
	last_successful_sync_id: -1
}

export default class Scrybble extends Plugin {
	settings: ScrybbleSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new Settings(this.app, this));

		if (this.settings.access_token !== null) {
			const json = await fetchSyncDelta(this.settings.access_token);
			synchronize(json, this);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

async function synchronize(syncResponse: { id: number, download_url: string, filename: string }[], plugin: Scrybble) {
	const lastSuccessfulSync = plugin.settings.last_successful_sync_id;
	const newFiles = syncResponse.filter((res) => res.id > lastSuccessfulSync);

	const fileCount = newFiles.length;
	if (fileCount > 0) {
		new Notice(`Found ${fileCount} new ReMarkable highlights. Downloading!`);
	} else {
		new Notice(`No new ReMarkable highlights found.`);
	}

	const vault = app.vault;
	try {
		await vault.createFolder('rm-highlights');
	} catch (e) {
	}
	for (const {download_url, filename, id} of newFiles) {
		new Notice(`Attempting to download ${filename}`,);
		const response = await requestUrl({
			method: "GET",
			url: download_url
		});
		const zip = await jszip.loadAsync(response.arrayBuffer)
		const data = await zip.file(/_remarks-only.pdf/)[0].async("arraybuffer");

		let dirPath;
		let nameOfFile;
		{
			const atoms = filename.split('/');
			const dirs = atoms.slice(0, atoms.length - 1);
			nameOfFile = atoms[atoms.length - 1].replace(':', '--');
			dirPath = dirs.join('/');
		}
		const fullPath = `rm-highlights${dirPath}`;
		try {
			await vault.createFolder(fullPath);
		} catch(e) {}

		const filePath = `${fullPath}/${nameOfFile}.pdf`;
		const file = vault.getAbstractFileByPath(filePath)
		if (file !== null) {
			await vault.delete(file);
		}
		await vault.createBinary(filePath, data);

		plugin.settings.last_successful_sync_id = id;
		await plugin.saveSettings();
	}
}

async function fetchSyncDelta(access_token: string) {
	const response = await fetch(`${base_url}/api/sync/delta`, {
		method: 'GET',
		mode: 'cors',
		headers: {
			"Accept": "application/json",
			"Authorization": `Bearer ${access_token}`
		}
	})
	return await response.json();
}

class Settings extends PluginSettingTab {
	plugin: Scrybble;

	constructor(app: App, plugin: Scrybble) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		let password = "";
		let username = "";

		containerEl.empty();
		containerEl.createEl('h2', {text: 'Sync ReMarkable notes'});

		new Setting(containerEl)
			.setName('Login')
			.setDesc('Login details')
			.addText(text => text
				.setPlaceholder('Enter your username')
				.onChange(async (value) => {
					username = value;
				}))
			.addText(text => {
				text.setPlaceholder('Enter your password');
				text.inputEl.setAttribute('type', 'password');
				text.onChange(async (value) => {
					password = value;
				});
			})

		new Setting(containerEl)
			.setName('Login')
			.setDesc('Log in')
			.addButton((button) => {
				button.setButtonText('Log in');
				button.onClick(async (value) => {
					const form = new URLSearchParams();
					const input = {
						'grant_type': 'password',
						'client_id': 1,
						'client_secret': '4L2wSQjPFAbGQFs6nfQkxxdNPBkWdfe86CIOxGlc',
						'username': username,
						'password': password,
						'scope': '',
					};
					for (let [key, value] of Object.entries(input)) {
						form.append(key, value);
					}

					try {
						const response = await fetch(`${base_url}/oauth/token`, {
							method: 'POST',
							mode: 'cors',
							headers: {
								"Accept": "application/json, text/plain, */*",
								"Content-Type": "application/x-www-form-urlencoded"
							},
							body: form
						})
						const result = await response.json();
						this.plugin.settings.access_token = result.access_token;
						await this.plugin.saveSettings();
					} catch (error) {
						console.log("error!", error);
					}
				});
			})

		new Setting(containerEl)
			.setName('Manual synchronization')
			.addButton((button) => {
				button.setButtonText('Go');
				button.onClick(async () => {
					try {
						const json = await fetchSyncDelta(this.plugin.settings.access_token);
						synchronize(json, this.plugin);
					} catch (e) {
						console.log('Failure: ', e);
					}
				})
			})
	}
}
