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

