import { Client } from "@notionhq/client";
import { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import chalk from "chalk";

import { PluginItems } from "../interface";
import { generateActivityTag, generateMobileTag } from "../utils";

/**
 * If the plugin is not in the database, add it in.
 * @param plugin {PluginItems}
 * @param database {QueryDatabaseResponse}
 */
export async function addNewEntry(plugin: PluginItems, notion: Client) {
	const mobileTag = generateMobileTag(plugin);
	const bodyParameters: CreatePageParameters = {
		parent: {
			database_id: process.env.NOTION_DATABASE_ID || "",
		},
		properties: {
			"ID": {
				title: [
					{
						type: "text",
						text: {
							content: plugin.id,
						},
					},
				],
			},
			"Name": {
				type: "rich_text",
				rich_text: [
					{
						type: "text",
						text: {
							content: plugin.name,
						},
					},
				],
			},
			"Author": {
				type: "rich_text",
				rich_text: [
					{
						type: "text",
						text: {
							content: plugin.author,
						}
					}
				]
			},
			"Description": {
				type: "rich_text",
				rich_text: [
					{
						type: "text",
						text: {
							content: plugin.description,
						},
					},
				],
			},
			"Repository": {
				type: "url",
				url: `https://github.com/${plugin.repo}`
			},
			"Funding": {
				type: "url",
				url: plugin?.fundingUrl || ""
			},
			"Tags": {
				type: "multi_select",
				//eslint-disable-next-line
				"multi_select": mobileTag as any,
			},
			"Last commit": {
				type: "date",
				date: {
					start: plugin.lastCommitDate ? new Date(plugin.lastCommitDate).toISOString() : "",
					end: null,
				},
			},
			"Repository status" : {
				type: "select",
				//eslint-disable-next-line
				select: generateActivityTag(plugin) as any,
			},
			"ETAG": {
				type: "rich_text",
				rich_text: [
					{
						type: "text",
						text: {
							content: plugin.ETAG || "",
						},
					},
				],
			},
		}
	};
	await notion.pages.create(bodyParameters);
	console.log(chalk.green(`Entry for ${plugin.name} (${chalk.underline(plugin.id)}) has been added to the database.`));
}


