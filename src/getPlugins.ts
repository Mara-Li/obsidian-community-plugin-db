import {Octokit} from "octokit";

import { PluginCommitDate, PluginItems } from "./interface";

/**
 * Get raw plugins list in JSON from github repo.
 * Use HTTPS request to get raw JSON data from github raw.url
 * @returns {Promise<PluginItems[]>} - Array of plugin items
 */
export async function getRawData(octokit: Octokit, dbCommitDate: PluginCommitDate[], length?: number): Promise<PluginItems[]> {
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
		const getDBcommitDate = dbCommitDate.find((item) => item.id === plugin.id);
		const repoInfo = await repositoryInformation(plugin, octokit, getDBcommitDate?.ETAG, getDBcommitDate?.commitDate);
		plugin.ETAG = repoInfo.ETAG;
		plugin.lastCommitDate = repoInfo.lastCommitDate;
	}
	return data as PluginItems[];
}

/**
 * Get the manifest of the plugin from github repo
 * @param plugin {PluginItems}
 * @returns {Promise<any>}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getManifestOfPlugin(plugin: PluginItems): Promise<any> {
	try {
		const manifest = await fetch(`https://raw.githubusercontent.com/${plugin.repo}/master/manifest.json`);
		return await manifest.json();
	} catch (error) {
		const manifest = await fetch(`https://raw.githubusercontent.com/${plugin.repo}/main/manifest.json`);
		return await manifest.json();
	}
}

/**
 * Use Octokit to get the last commit date of the plugin, allowing quick triage of the plugin status
 * Register the ETAG of the request to avoid unnecessary request & broken my rate limit
 * @param plugin {PluginItems} - The plugin to check
 * @param octokit {Octokit} - GitHub Api client because I need to be authenticated to use the API
 * @param ETAG {string} - The ETAG of the last request
 * @param lastCommitDate {string} - The last commit date of the plugin
 * @returns {Promise<{ETAG: string | undefined, lastCommitDate: string | undefined}>}
 */
async function repositoryInformation(plugin: PluginItems, octokit: Octokit, ETAG?: string, lastCommitDate?: string): Promise<{ ETAG: string | undefined; lastCommitDate: string | undefined; }> {
	try {
		const commits = await octokit.request("GET /repos/{owner}/{repo}/commits", {
			owner: plugin.repo.split("/")[0],
			repo: plugin.repo.split("/")[1],
			per_page: 1,
			headers: {
				"If-None-Match": ETAG
			},
		});
		return {
			ETAG: commits.headers.etag?.replace("W/", ""),
			lastCommitDate: commits.data[0].commit.author?.date ? new Date(commits.data[0].commit.author?.date).toISOString() : lastCommitDate,
		};
	} catch (error) { //HTTP 304 Not Modified
		//console.log(chalk.yellow(`No update for ${plugin.name} (${plugin.id})`));
		return {
			ETAG,
			lastCommitDate,
		};
	}
}