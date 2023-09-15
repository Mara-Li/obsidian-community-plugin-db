import { Client } from "@notionhq/client";
import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import chalk from "chalk";

import { PluginItems, PropertyURL, RichText, UpdateProperty } from "../interface";
import { generateMobileTag, generateRichText } from "../utils";
import { searchPageInDatabase, searchTagsInMultiSelect } from "./search";

/**
 * If a plugin already exist in the DB, compare all entry. If one of the entry content is different, update the page
 * @param plugin {PluginItems}
 * @param notion {Client}
 */
export async function updateOldEntry(plugin: PluginItems, database: QueryDatabaseResponse[], pageID: string, notion: Client) {
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
		id: plugin.id,
		//@ts-ignore
		fundingUrl: page.properties.Funding.url,
		isDesktopOnly: plugin.isDesktopOnly
	};

	const actualPageProperty: UpdateProperty = {
		//@ts-ignore
		"Author": page.properties.Author,
		//@ts-ignore
		"Description": page.properties.Description,
		//@ts-ignore
		"Name": page.properties.Name,
		//@ts-ignore
		"Repository": page.properties.Repository,
		//@ts-ignore
		"Funding": page.properties.Funding,
		//@ts-ignore
		Tags: page.properties.Tags
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
	if (plugin.fundingUrl && pageProperty?.fundingUrl !== plugin.fundingUrl) {
		actualPageProperty.Funding = generateRichText(plugin, "funding") as PropertyURL;
		toUpdate = true;
		console.log(chalk.red(`Mismatch: ${pageProperty.fundingUrl} !== ${plugin.fundingUrl}`));
	}
	const searchTag = searchTagsInMultiSelect(actualPageProperty.Tags, plugin);
	if (searchTag === "add") {
		const mobile = generateMobileTag(plugin);
		//@ts-ignore
		actualPageProperty.Tags.multi_select.push(...mobile);
		toUpdate = true;
		console.log(chalk.red("Mismatch: #mobile tag is missing."));
	} else if (searchTag === "remove") {
		//remove mobile tag
		//@ts-ignore
		//eslint-disable-next-line
		actualPageProperty.Tags.multi_select = actualPageProperty.Tags.multi_select.filter((tag: any) => tag.name !== "mobile");
		toUpdate = true;
		console.log(chalk.red("Mismatch: #mobile tag must be removed."));
	}

	if (toUpdate) {
		await notion.pages.update({
			page_id: pageID,
			//eslint-disable-next-line
			properties: actualPageProperty as any,
		});
		console.log(chalk.cyanBright(`✓ ${plugin.name} (${chalk.underline(plugin.id)}) updated!`));
	} else {
		console.log(chalk.grey.italic(`${plugin.name} (${chalk.underline(plugin.id)}) doesn't need to be updated!`));
	}
}