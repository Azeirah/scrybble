import {App, Notice, requestUrl, TFile} from "obsidian"
import * as jszip from "jszip"
import {SyncDelta} from "../@types/scrybble";

/**
 * Dir paths always end with /
 * @param filePath
 */
function dirPath(filePath: string): string {
	const atoms = filePath.split("/")
	const dirs = atoms.slice(0, atoms.length - 1)
	return dirs.filter((a) => Boolean(a)).join("/") + "/"
}

function basename(filePath: string): string {
	const atoms = filePath.split("/")
	return atoms[atoms.length - 1]
}

function sanitizeFilename(filePath: string): string {
	const tokens = ['*', '"', "\\", "/", "<", ">", ":", "|", "?"];

	tokens.forEach((token) => {
		const regex = new RegExp('\\' + token, 'g');
		filePath = filePath.replace(regex, "_");
	});

	return filePath;
}

async function writeToFile(vault: App["vault"], filePath: string, data: ArrayBuffer) {
	const file = vault.getAbstractFileByPath(filePath)
	if (file === null) {
		try {
			await vault.createBinary(filePath, data)
		} catch {
			throw new Error(`Scrybble: Was unable to write file ${filePath}, reference = 104`)
		}
	} else if (file instanceof TFile) {
		try {
			await vault.modifyBinary(file, data)
		} catch {
			throw new Error(`Scrybble: Was unable to modify file ${filePath}, reference = 105`)
		}
	} else {
		throw new Error("Scrybble: Unknown error reference = 103")
	}
}

async function ensureFolderExists(vault: App["vault"], relativePath: string, sync_folder: string) {
	let folderPath = relativePath.startsWith("/") ? `${sync_folder}${relativePath}` : `${sync_folder}/${relativePath}`
	folderPath = folderPath.split("/").map((folderName) => sanitizeFilename(folderName)).join("/")
	try {
		await vault.createFolder(folderPath)
	} catch (e) {
		if (e instanceof Error && !e.message.includes("already exists")) {
			new Notice(`Scrybble: failed to create Scrybble highlights folder at ${relativePath}. Error reference = 102`)
		}
	}

	return folderPath
}

async function zippedFileToVault(vault: App["vault"], zip: jszip, nameMatch: RegExp, vaultFileName: string, required = true) {
	try {
		const data = await zip.file(nameMatch)[0].async("arraybuffer")
		await writeToFile(vault, vaultFileName, data)
	} catch (e) {
		if (required) {
			throw new Error("Scrybble: Missing file in downloaded sync zip, reference = 106")
		} else {
			return;
		}
	}
}

export async function* synchronize(syncResponse: ReadonlyArray<SyncDelta>, lastSuccessfulSync: number, sync_folder: string): AsyncGenerator<number> {
	const newFiles = syncResponse.filter((res) => res.id > lastSuccessfulSync)

	const fileCount = newFiles.length
	if (fileCount > 0) {
		new Notice(`Found ${fileCount} new ReMarkable highlights. Downloading!`)
	} else {
		new Notice(`No new ReMarkable highlights found.`)
	}

	const vault = app.vault

	await ensureFolderExists(vault, "", sync_folder)
	for (const {download_url, filename, id} of newFiles) {
		let relativePath = dirPath(filename)
		let nameOfFile = sanitizeFilename(basename(filename))
		const folderPath = await ensureFolderExists(vault, relativePath, sync_folder)

		const progress = new Notice(`Attempting to download ${filename}`)
		const response = await requestUrl({
			method: "GET",
			url: download_url
		})

		try {
			const zip = await jszip.loadAsync(response.arrayBuffer)
			await zippedFileToVault(vault, zip, /_remarks(-only)?.pdf/, `${folderPath}${nameOfFile}.pdf`)
			await zippedFileToVault(vault, zip, /_obsidian.md/, `${folderPath}${nameOfFile}.md`, false)
		} catch (e) {
			progress.setMessage(`Failed to download ${filename}, skipping`)
		}

		yield id;
	}
}

export async function fetchSyncDelta(base_url: string, access_token: string): Promise<ReadonlyArray<SyncDelta>> {
	const response = await requestUrl({
		url: `${base_url}/api/sync/delta`,
		method: "GET",
		headers: {
			"Accept": "application/json",
			"Authorization": `Bearer ${access_token}`
		}
	})
	return response.json
}

export async function fetchOAuthToken(base_url: string, client_secret: string, username: string, password: string): Promise<{
	access_token: string
}> {
	const response = await requestUrl({
		url: `${base_url}/oauth/token`,
		method: "POST",
		headers: {
			"Accept": "application/json, text/plain, */*",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			"grant_type": "password",
			"client_id": "1",
			"client_secret": client_secret,
			"username": username,
			"password": password,
			"scope": ""
		})
	})
	return response.json
}
