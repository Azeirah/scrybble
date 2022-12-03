import {Notice, requestUrl} from "obsidian";
import * as jszip from "jszip";

const base_url = "https://scrybble.ink";

type SyncDelta = { id: number, download_url: string, filename: string };

export async function synchronize(syncResponse: ReadonlyArray<SyncDelta>, lastSuccessfulSync: number): Promise<number | undefined> {
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
		new Notice(`Scrybble: Failed to create Scrybble highlights folder, error reference = 102`);
	}
	let last_id;
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
		} catch (e) {
		}

		const filePath = `${fullPath}/${nameOfFile}.pdf`;
		const file = vault.getAbstractFileByPath(filePath)
		if (file !== null) {
			await vault.delete(file);
		}
		await vault.createBinary(filePath, data);

		last_id = id;
	}
	return last_id;
}

export async function fetchSyncDelta(access_token: string): Promise<ReadonlyArray<SyncDelta>> {
	const response = await requestUrl({
		url: `${base_url}/api/sync/delta`,
		method: 'GET',
		headers: {
			"Accept": "application/json",
			"Authorization": `Bearer ${access_token}`
		}
	})
	return await response.json();
}

export async function fetchOAuthToken(username: string, password: string): Promise<{
	access_token: string
}> {
	const response = await requestUrl({
		url: `${base_url}/oauth/token`,
		method: 'POST',
		headers: {
			"Accept": "application/json, text/plain, */*",
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: JSON.stringify({
			'grant_type': 'password',
			'client_id': "1",
			'client_secret': '4L2wSQjPFAbGQFs6nfQkxxdNPBkWdfe86CIOxGlc',
			'username': username,
			'password': password,
			'scope': '',
		})
	});
	return await response.json();
}
