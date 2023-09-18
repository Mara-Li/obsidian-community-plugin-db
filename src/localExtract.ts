/**
 * Just for local extract the plugin list for the references
 * No needed for the main project
 * Call it with `npm run localExtract`
 */

import { writeFileSync } from "fs";
import {join} from "path";

import { PluginItems } from "./interface";



async function getCommunityList(length?: number) {
	const url = "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json";
	const content = await fetch(url);
	let data = await content.json() as PluginItems[];
	if (length) {
		data = data.slice(0, length);
	}
	/** convert data into markdown list using - plugin.name : plugin.id */
	const markdownList = data.map((plugin) => `- ${plugin.name} : ${plugin.id}`);
	/** Add the markdown list into a markdown file */
	const file = join(__dirname, "localExtract.md");
	console.log(`Writing to ${file}`);
	writeFileSync(file, markdownList.join("\n"));
	console.log(`Extracted ${data.length} plugins.`);
}

await getCommunityList();