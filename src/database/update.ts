import { Client } from "@notionhq/client";
import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import chalk from "chalk";

import { PluginItems, PropertyURL, RichText, UpdateProperty } from "../interface";
import { generateActivityTag, generateMobileTag, generateRichText, uniDate } from "../utils";
import { searchPageInDatabase, searchTagsInMultiSelect } from "./search";

/**
 * If a plugin already exist in the DB, compare all entry. If one of the entry content is different, update the page
 * @param plugin {PluginItems}
 * @param notion {Client}
 * @param database {QueryDatabaseResponse[]} - The database
 * @param pageID {string} - The pageID of the plugin
 */
export async function updateOldEntry(plugin: PluginItems, database: QueryDatabaseResponse[], pageID: string, notion: Client) {
	const page = searchPageInDatabase(database, pageID);
	if (!page) {
		console.log(chalk.red(`Error: pageID ${pageID} doesn't exist in the database.`));
		return;
	}
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
		isDesktopOnly: plugin.isDesktopOnly,
		//@ts-ignore
		lastCommitDate: page.properties["Last commit"].date?.start ?? null,
		//@ts-ignore
		ETAG: page.properties.ETAG.rich_text[0]?.plain_text ?? null,
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
		Tags: page.properties.Tags,
		//@ts-ignore
		"Last commit": page.properties["Last commit"],
		//@ts-ignore
		"Repository status": page.properties["Repository status"],
		//@ts-ignore
		"ETAG": page.properties.ETAG,
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
		//@ts-ignore
		//eslint-disable-next-line
		actualPageProperty.Tags.multi_select = actualPageProperty.Tags.multi_select.filter((tag: any) => tag.name !== "mobile");
		toUpdate = true;
		console.log(chalk.red("Mismatch: #mobile tag must be removed."));
	}
	if (plugin.lastCommitDate && uniDate(pageProperty.lastCommitDate) !== uniDate(plugin.lastCommitDate)) {
		actualPageProperty["Last commit"] = {
			type: "date",
			date: {
				start: new Date(plugin.lastCommitDate).toISOString(),
				end: null,
			}
		};
		toUpdate = true;
		console.log(chalk.red(`Mismatch: ${uniDate(pageProperty.lastCommitDate)} !== ${uniDate(plugin.lastCommitDate)}`));
	}
	if (plugin.ETAG && pageProperty.ETAG !== plugin.ETAG) {
		actualPageProperty.ETAG = generateRichText(plugin, "ETAG") as RichText;
		toUpdate = true;
		console.log(chalk.red(`Mismatch: ${pageProperty.ETAG} !== ${plugin.ETAG}`));
	}
	const oldStatuts = generateActivityTag(pageProperty);
	const newStatuts = generateActivityTag(plugin);
	//@ts-ignore
	if (!actualPageProperty["Repository status"].select) {
		//@ts-ignore
		actualPageProperty["Repository status"].select = newStatuts;
		toUpdate = true;
		console.log(chalk.red("Mismatch: No status found"));
	}
	if (oldStatuts.name !== newStatuts.name && oldStatuts.name !== "#ARCHIVED") {
		//@ts-ignore
		actualPageProperty["Repository status"].select = newStatuts;
		toUpdate = true;
		console.log(chalk.red(`Mismatch: ${oldStatuts.name} !== ${newStatuts.name}`));
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