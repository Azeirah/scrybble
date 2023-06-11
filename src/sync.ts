import {Notice, requestUrl, TFile} from "obsidian"
import * as jszip from "jszip"
import {SyncDelta} from "../@types/scrybble";

const base_url = "https://scrybble.ink"

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

export async function synchronize(syncResponse: ReadonlyArray<SyncDelta>, lastSuccessfulSync: number): Promise<number | undefined> {
	const newFiles = syncResponse.filter((res) => res.id > lastSuccessfulSync)

	const fileCount = newFiles.length
	if (fileCount > 0) {
		new Notice(`Found ${fileCount} new ReMarkable highlights. Downloading!`)
	} else {
		new Notice(`No new ReMarkable highlights found.`)
	}

	const vault = app.vault
	try {
		await vault.createFolder("rm-highlights")
	} catch (e) {
		if (e instanceof Error && !e.message.includes("already exists")) {
			new Notice(`Scrybble: Failed to create Scrybble highlights folder, error reference = 102`)
		}
	}
	let last_id
	for (const {download_url, filename, id} of newFiles) {
		new Notice(`Attempting to download ${filename}`)
		const response = await requestUrl({
			method: "GET",
			url: download_url
		})
		const zip = await jszip.loadAsync(response.arrayBuffer)
		const data = await zip.file(/_remarks(-only)?.pdf/)[0].async("arraybuffer")

		let relativePath = dirPath(filename)
		let nameOfFile = basename(filename)

		const folderPath = relativePath.startsWith("/") ? `rm-highlights${relativePath}` : `rm-highlights/${relativePath}`
		try {
			await vault.createFolder(folderPath)
		} catch (e) {
		}

		const filePath = `${folderPath}${nameOfFile}.pdf`
		const file = vault.getAbstractFileByPath(filePath)
		if (file === null) {
			await vault.createBinary(filePath, data)
		} else if (file instanceof TFile) {
			await vault.modifyBinary(file, data)
		} else {
			throw new Error("Scrybble: Unknown error reference = 103")
		}

		last_id = id
	}
	return last_id
}

export async function fetchSyncDelta(access_token: string): Promise<ReadonlyArray<SyncDelta>> {
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

export async function fetchOAuthToken(username: string, password: string): Promise<{
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
			"client_secret": "4L2wSQjPFAbGQFs6nfQkxxdNPBkWdfe86CIOxGlc",
			"username": username,
			"password": password,
			"scope": ""
		})
	})
	return response.json
}
