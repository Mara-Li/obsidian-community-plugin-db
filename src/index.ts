import { Client } from "@notionhq/client";
import { CreatePageParameters, QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import chalk from "chalk";
import { config } from "dotenv";

import { PluginItems, PropertyURL, RichText, UpdateProperty } from "./interface";
import { generateRichText } from "./utils";

config();

/**
 * Get raw plugins list in JSON from github repo.
 * Use HTTPS request to get raw JSON data from github raw.url
 * @returns {Promise<PluginItems[]>} - Array of plugin items
 */
async function getRawData() {
	const url = "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json";
	const content = await fetch(url);
	const data = await content.json();
	return data as PluginItems[];
}

/** 
 * Verify if a plugin is already in the DB 
 * @param plugin {PluginItems} - The plugin to check 
 * @returns string | undefined : The page ID if exists
*/
async function verifyIfPluginAlreadyExists(plugin: PluginItems, response: QueryDatabaseResponse) {
	console.log(chalk.black.underline(`Looking for ${plugin.name} (${plugin.id}) in the database...`));
	//@ts-ignore
	return response.results.find((item) => {
		//@ts-ignore
		return item.properties.ID.title[0].plain_text == plugin.id;
	})?.id ?? undefined;
}

/**
 * If the plugin is not in the database, add it in.
 * @param plugin {PluginItems}
 * @param database {QueryDatabaseResponse}
 */
async function addNewEntry(plugin: PluginItems, notion: Client) {
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
			"Tags": {
				type: "multi_select",
				"multi_select": []
			},
			"Notes": {
				type: "rich_text",
				rich_text: []
			}
		}
	};
	await notion.pages.create(bodyParameters);
	console.log(chalk.green(`Entry for ${plugin.name} (${plugin.id}) has been added to the database.`));
}

/**
 * If a plugin already exist in the DB, compare all entry. If one of the entry content is different, update the page
 * @param plugin {PluginItems}
 * @param notion {Client}
 */
async function updateOldEntry(plugin: PluginItems, database: QueryDatabaseResponse, pageID: string, notion: Client) {
	//verify property of pageID
	//get page_id in DB
	const page = database.results.find((item) => {
		return item.id === pageID;
	});
	//create pageProperty as PluginItems
	const pageProperty: PluginItems = {
		//@ts-ignore
		author: page.properties.Author.rich_text[0].plain_text,
		//@ts-ignore
		name: page.properties.Name.rich_text[0].plain_text,
		//@ts-ignore
		description: page.properties.Description.rich_text[0].plain_text,
		//@ts-ignore
		repo: page.properties.Repository.url.replace("https://github.com/", ""),
		id: plugin.id
	};

	const properties: UpdateProperty = {
		//@ts-ignore
		"Author": page.properties.Author,
		//@ts-ignore
		"Description": page.properties.Description,
		//@ts-ignore
		"Name": page.properties.Name,
		//@ts-ignore
		"Repository": page.properties.Repository
	};

	let toUpdate = false;
	if (pageProperty.author !== plugin.author) {
		properties.Author = generateRichText(plugin, "author") as RichText;
		toUpdate = true;
		console.log(chalk.red(`Mismatch : ${pageProperty.author} !== ${plugin.author}`));
	}
	if (pageProperty.description !== plugin.description) {
		properties.Description = generateRichText(plugin, "description") as RichText;
		toUpdate = true;
		console.log(chalk.red(`Mismatch: ${pageProperty.description} !== ${plugin.author}`));
	}
	if (pageProperty.name !== plugin.name) {
		properties.Name = generateRichText(plugin, "name") as RichText;
		toUpdate = true;
		console.log(chalk.red(`Mismatch: ${pageProperty.name} !== ${plugin.name}`));
	}
	if (pageProperty.repo !== plugin.repo) {
		properties.Repository = generateRichText(plugin, "repo") as PropertyURL;
		toUpdate = true;
		console.log(chalk.red(`Mismatch: ${pageProperty.repo} !== ${plugin.repo}`));
	}
	if (toUpdate) {
		await notion.pages.update({
			page_id: pageID,
			//eslint-disable-next-line
			properties: properties as any,
		});
	} else {
		console.log(chalk.grey(`${plugin.name} (${plugin.id}) doesn't need to be updated!`));
	}
}

async function main() {
	const notion = new Client({
		auth: process.env.NOTION_TOKEN,
	});

	const response = await notion.databases.query({
		database_id: process.env.NOTION_DATABASE_ID || "",
	});
	const allPlugins = await getRawData();
	for (const plugin of allPlugins.slice(0, 10)) {
		const pageID = await verifyIfPluginAlreadyExists(plugin, response);
		if (pageID) {
			console.log(chalk.yellow(`${plugin.name} (${plugin.id}) already exists in the DB!`));
			await updateOldEntry(plugin, response, pageID, notion);
		} else {
			await addNewEntry(plugin, notion);
		}
	}
}

await main();