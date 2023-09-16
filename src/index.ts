import { Client } from "@notionhq/client";
import chalk from "chalk";
import { config } from "dotenv";
import ora from "ora";

import { addNewEntry } from "./database/add";
import { searchDeletedPlugins, verifyIfPluginAlreadyExists } from "./database/search";
import { updateOldEntry } from "./database/update";
import { deletePageID } from "./delete";
import { getRawData } from "./getPlugins";
import { TEST_PLUGIN } from "./interface";


config();


async function main() {
	const notion = new Client({
		auth: process.env.NOTION_TOKEN,
	});
	const dev = process.env.NODE_ENV === "development";
	const test = process.env.TEST === "true";

	let maxLength: undefined | number;
	if (dev) {
		maxLength = 10;
	}

	const spinner = ora({
		text: chalk.yellow("Fetching plugin list..."),
		color: "yellow",
	}).start();
	const allPlugins = await getRawData(maxLength);
	spinner.succeed(chalk.green(`Plugins list fetched! ${allPlugins.length} plugins found.`));
	if (test) {
		console.log(`${chalk.blueBright.italic.underline(`Adding test plugin ${TEST_PLUGIN.name} (${chalk.underline(TEST_PLUGIN.id)}) to the list...`)}\n`);
		allPlugins.push(TEST_PLUGIN);
	}

	spinner.start(chalk.yellow("Fetching database..."));
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

	for (const plugin of allPlugins) {
		const pageID = verifyIfPluginAlreadyExists(plugin, allResponse);
		if (pageID) {
			console.log(chalk.grey.italic(`Entry for ${plugin.name} (${chalk.underline(plugin.id)}) already exists in the database.`));
			await updateOldEntry(plugin, allResponse, pageID, notion);
		} else {
			console.log(chalk.red(`Entry for ${plugin.name} (${chalk.underline(plugin.id)}) doesn't exist in the database.`));
			await addNewEntry(plugin, notion);
		}
	}
	console.log();
	spinner.start(chalk.underline("Search deleted plugins..."));
	const deletedPlugins = searchDeletedPlugins(allPlugins, allResponse);
	if (deletedPlugins.length > 0) {
		spinner.succeed(chalk.green(`Found ${deletedPlugins.length} deleted plugins.`));
		for (const plugin of deletedPlugins) {
			//console.log(chalk.redBright(`- ${plugin.pluginName} (${chalk.underline(plugin.pluginID)})`));
			if (!dev)
				await deletePageID(plugin, notion);
		}
	} else {
		spinner.fail(chalk.gray("No deleted plugins found."));
	}
}

await main();