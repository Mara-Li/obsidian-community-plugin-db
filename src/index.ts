import { Client } from "@notionhq/client";
import { CreatePageParameters, QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import chalk from "chalk";
import { config } from "dotenv";
import ora from "ora";

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
async function verifyIfPluginAlreadyExists(plugin: PluginItems, allResponse: QueryDatabaseResponse[]) {
	console.log(chalk.black("• ") + chalk.black.underline(`Looking for ${plugin.name} (${plugin.id}) in the database...`));
	//search all response
	for (const response of allResponse) {
		//search all results
		for (const result of response.results) {
			//@ts-ignore
			if (result.properties.ID.title[0].text.content === plugin.id) {
				return result.id;
			}
		}
	}
	return undefined;
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

function searchPageInDatabase(database: QueryDatabaseResponse[], pageID: string) {
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
 * If a plugin already exist in the DB, compare all entry. If one of the entry content is different, update the page
 * @param plugin {PluginItems}
 * @param notion {Client}
 */
async function updateOldEntry(plugin: PluginItems, database: QueryDatabaseResponse[], pageID: string, notion: Client) {
	//verify property of pageID
	//get page_id in DB
	const page = searchPageInDatabase(database, pageID);
	if (!page) {
		console.log(chalk.red(`Error: pageID ${pageID} doesn't exist in the database.`));
		return;
	}
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

	const actualPageProperty: UpdateProperty = {
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
		actualPageProperty.Author = generateRichText(plugin, "author") as RichText;
		toUpdate = true;
		console.log(chalk.red(`Mismatch : ${pageProperty.author} !== ${plugin.author}`));
	}
	if (pageProperty.description !== plugin.description) {
		actualPageProperty.Description = generateRichText(plugin, "description") as RichText;
		toUpdate = true;
		console.log(chalk.red(`Mismatch: ${pageProperty.description} !== ${plugin.author}`));
	}
	if (pageProperty.name !== plugin.name) {
		actualPageProperty.Name = generateRichText(plugin, "name") as RichText;
		toUpdate = true;
		console.log(chalk.red(`Mismatch: ${pageProperty.name} !== ${plugin.name}`));
	}
	if (pageProperty.repo !== plugin.repo) {
		actualPageProperty.Repository = generateRichText(plugin, "repo") as PropertyURL;
		toUpdate = true;
		console.log(chalk.red(`Mismatch: ${pageProperty.repo} !== ${plugin.repo}`));
	}
	if (toUpdate) {
		await notion.pages.update({
			page_id: pageID,
			//eslint-disable-next-line
			properties: actualPageProperty as any,
		});
	} else {
		console.log(chalk.grey(`${plugin.name} (${plugin.id}) doesn't need to be updated!`));
	}
}

async function main() {
	const notion = new Client({
		auth: process.env.NOTION_TOKEN,
	});

	const spinner = ora({
		text: chalk.yellow("Fetching database..."),
		color: "yellow",
	}).start();
	let response = await notion.databases.query({
		database_id: process.env.NOTION_DATABASE_ID || "",
	});
	const allResponse = [];
	allResponse.push(response);
	while (response.has_more) {
		response = await notion.databases.query({
			database_id: process.env.NOTION_DATABASE_ID || "",
			start_cursor: response.next_cursor as string
		});
		allResponse.push(response);
	}
	spinner.succeed(
		chalk.green(`Database fetched! ${allResponse.length} pages found in the database.`)
	);
	console.log();
	const allPlugins = await getRawData();
	for (const plugin of allPlugins) {
		const pageID = await verifyIfPluginAlreadyExists(plugin, allResponse);
		if (pageID) {
			console.log(chalk.green(`Entry for ${plugin.name} (${plugin.id}) already exists in the database.`));
			await updateOldEntry(plugin, allResponse, pageID, notion);
		} else {
			console.log(chalk.red(`Entry for ${plugin.name} (${plugin.id}) doesn't exist in the database.`));
			await addNewEntry(plugin, notion);
		}
	}
}

await main();