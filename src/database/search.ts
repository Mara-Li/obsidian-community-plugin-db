import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import chalk from "chalk";

import { PluginItems } from "../interface";

export function searchPageInDatabase(database: QueryDatabaseResponse[], pageID: string) {
	for (const response of database) {
		for (const result of response.results) {
			if (result.id === pageID) {
				return result;
			}
		}
	}
	return undefined;
}

//eslint-disable-next-line
export function searchTagsInMultiSelect(tags: any, plugin: PluginItems): "remove" | "add" | "none" {
	for (const tag of tags.multi_select) {
		if (tag.name === "mobile" && plugin.isDesktopOnly) { //need to remove mobile tag
			return "remove";
		} else if (tag.name === "mobile" && !plugin.isDesktopOnly) {
			return "none";
		}
	}
	if (!plugin.isDesktopOnly) {
		return "add";
	}
	return "none";
}

/** 
 * Verify if a plugin is already in the DB 
 * @param plugin {PluginItems} - The plugin to check 
 * @returns string | undefined : The page ID if exists
*/
export async function verifyIfPluginAlreadyExists(plugin: PluginItems, allResponse: QueryDatabaseResponse[]) {
	console.log(chalk.blueBright.italic("• ") + chalk.blueBright.italic.underline(`Looking for ${plugin.name} (${chalk.underline(plugin.id)}) in the database...`));
	//search all response
	for (const response of allResponse) {
		//search all results
		for (const result of response.results) {
			//@ts-ignore
			if (result.properties.ID.title[0]?.text.content === plugin.id) {
				return result.id;
			}
		}
	}
	return undefined;
}