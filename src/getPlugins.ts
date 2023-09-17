import {Octokit} from "octokit";

import { PluginCommitDate, PluginItems } from "./interface";

/**
 * Get raw plugins list in JSON from github repo.
 * Use HTTPS request to get raw JSON data from github raw.url
 * @returns {Promise<PluginItems[]>} - Array of plugin items
 */
export async function getRawData(octokit: Octokit, dbCommitDate: PluginCommitDate[], length?: number) {
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

async function getManifestOfPlugin(plugin: PluginItems) {
	try {
		const manifest = await fetch(`https://raw.githubusercontent.com/${plugin.repo}/master/manifest.json`);
		return await manifest.json();
	} catch (error) {
		const manifest = await fetch(`https://raw.githubusercontent.com/${plugin.repo}/main/manifest.json`);
		return await manifest.json();
	}
}

async function repositoryInformation(plugin: PluginItems, octokit: Octokit, ETAG?: string, lastCommitDate?: string) {
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
		return {
			ETAG,
			lastCommitDate,
		};
	}
}