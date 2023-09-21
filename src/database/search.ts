import { PartialDatabaseObjectResponse, PartialPageObjectResponse, QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import chalk from "chalk";

import { DeletedPlugins, PluginCommitDate,PluginItems } from "../interface";
/**
 * Search a page in the database
 * @param database {QueryDatabaseResponse[]}
 * @param pageID {string}
 * @returns {PartialPageObjectResponse | PartialDatabaseObjectResponse | undefined}
 */
export function searchPageInDatabase(database: QueryDatabaseResponse[], pageID: string): PartialPageObjectResponse | PartialDatabaseObjectResponse | undefined {
	for (const response of database) {
		for (const result of response.results) {
			if (result.id === pageID) {
				return result;
			}
		}
	}
	return undefined;
}

/**
 * Search a specific tags in the multi_select property, and return if the tag need to be added, removed or nothing
 * @param tags {any}
 * @param plugin {PluginItems}
 * @returns {"remove" | "add" | "none"}
 */
//eslint-disable-next-line
export function searchTagsInMultiSelect(tags: any, plugin: PluginItems): "remove" | "add" | "none" {
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	const errorTags = tags.multi_select.find((tag: any) => tag.name === "❌"); //prevent adding the mobile tag to be added if the plugin have the ERROR tag
	if (errorTags) {
		return "none";
	}
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
export function verifyIfPluginAlreadyExists(plugin: PluginItems, allResponse: QueryDatabaseResponse[]) {
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
/**
 * Compare plugins list and database to see if a plugin was removed from the pluginList and not from the database
 * @param allPlugins {PluginItems[]} - The plugins to check
 * @param allResponse {QueryDatabaseResponse[]} - The database response
 * @returns {string | undefined}
 */
export function searchDeletedPlugins(allPlugins:PluginItems[], allResponse: QueryDatabaseResponse[]): DeletedPlugins[] {
	const deletedPlugins= [];
	for (const response of allResponse) {
		for (const result of response.results) {
			//@ts-ignore
			const pluginID = result.properties.ID.title[0]?.text.content;
			//@ts-ignore
			const pluginName = result.properties.Name.rich_text[0]?.plain_text;
			//@ts-ignore
			const plugin = allPlugins.find(plugin => plugin.id === pluginID);
			if (!plugin) {
				deletedPlugins.push({
					id: result.id,
					pluginID,
					pluginName
				});
			}
		}
	}
	return deletedPlugins;
}

/**
 * Get all ETAG by plugins from the database
 * @param allResponse {QueryDatabaseResponse[]} - The database response
 * @returns PluginCommitDate[]
 */
export function getAllETAGByPlugins(allResponse: QueryDatabaseResponse[]) {
	const allCommitDate:PluginCommitDate[] = [];
	for (const response of allResponse) {
		for (const result of response.results) {
			//@ts-ignore
			const ETAG = result.properties.ETAG.rich_text[0]?.plain_text;
			//@ts-ignore
			const lastCommitDate = result.properties["Last commit"].date?.start;
			//@ts-ignore
			const pluginID = result.properties.ID.title[0]?.text.content;
			allCommitDate.push({
				id: pluginID,
				ETAG,
				commitDate: lastCommitDate
			});
		}
	}
	return allCommitDate;
}