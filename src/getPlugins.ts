import { PluginItems } from "./interface";

/**
 * Get raw plugins list in JSON from github repo.
 * Use HTTPS request to get raw JSON data from github raw.url
 * @returns {Promise<PluginItems[]>} - Array of plugin items
 */
export async function getRawData(length?: number) {
	const url = "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json";
	const content = await fetch(url);
	let data = await content.json() as PluginItems[];
	if (length) {
		data = data.slice(0, length);
	}
	for (const plugin of data) {
		const manifest = await getManifestOfPlugin(plugin);
		plugin.isDesktopOnly = manifest.isDesktopOnly || false;
		plugin.fundingUrl = typeof manifest.fundingUrl === "object" ? Object.values(manifest.fundingUrl)[0] as string : manifest.fundingUrl ?? "";
		plugin.lastCommitDate = await getLastCommitDate(plugin);
		plugin.repoArchived = await isArchivedRepo(plugin);
	}
	return data as PluginItems[];
}

async function getManifestOfPlugin(plugin: PluginItems) {
	try {
		const manifest = await fetch(`https://raw.githubusercontent.com/${plugin.repo}/master/manifest.json`);
		return await manifest.json();
	} catch (error) {
		const manifest = await fetch(`https://raw.githubusercontent.com/${plugin.repo}/main/manifest.json`);
		return await manifest.json();
	}
}

async function getLastCommitDate(plugin: PluginItems) {
	const commit = await fetch(`https://api.github.com/repos/${plugin.repo}/commits`);
	const data = await commit.json();
	return data[0].commit.author.date;
}

async function isArchivedRepo(plugin: PluginItems) {
	const repo = await fetch(`https://api.github.com/repos/${plugin.repo}`);
	const data = await repo.json();
	return data.archived;
}