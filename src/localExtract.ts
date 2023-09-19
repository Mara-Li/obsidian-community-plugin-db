/**
 * Just for local extract the plugin list for the references
 * No needed for the main project
 * Call it with `npm run localExtract`
 */

import { existsSync, readFileSync,writeFileSync } from "fs";
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
	const markdownList = data.map((plugin) => `${plugin.name} : ${plugin.id}`);
	/** Add the markdown list into a markdown file */
	const file = join(__dirname, "localExtract.md");
	console.log(`Writing to ${file}`);
	if (existsSync(file)) {
		//extract the old list
		const contents = readFileSync(file, "utf-8");
		const oldList = contents.split(/\n/);
		//remove the old list from the new list
		const newList = markdownList.filter((plugin) =>
			!oldList
				.map((line) => line.replace(/- \[[x ]\] /gi, "").trim())
				.includes(plugin));
		if (newList.length === 0) {
			console.log("No new plugins to add.");
			return;
		}

		const newContent = `${oldList.join("\n")}- [ ] ${newList.join("\n- [ ] ")}`;
		console.log(`Extracted ${newList.length} new plugins.`);
		writeFileSync(file, newContent);
	} else {
		writeFileSync(file, markdownList.join("\n"));
		console.log(`Extracted ${data.length} plugins.`);

	}

}

await getCommunityList();