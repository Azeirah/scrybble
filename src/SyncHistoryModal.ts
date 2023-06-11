import {App, Modal, Setting} from "obsidian";
import Scrybble from "../main";

export class SyncHistoryModal extends Modal {
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
