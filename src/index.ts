import { Client } from "@notionhq/client";
import chalk from "chalk";
import { config } from "dotenv";
import ora from "ora";

import { addNewEntry } from "./database/add";
import { verifyIfPluginAlreadyExists } from "./database/search";
import { updateOldEntry } from "./database/update";
import { getRawData } from "./getPlugins";


config();


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
	spinner.start(chalk.yellow("Fetching plugins list..."));
	const allPlugins = await getRawData();
	spinner.succeed(chalk.green(`Plugins list fetched! ${allPlugins.length} plugins found.`));
	for (const plugin of allPlugins) {
		const pageID = await verifyIfPluginAlreadyExists(plugin, allResponse);
		if (pageID) {
			console.log(chalk.grey.italic(`Entry for ${plugin.name} (${chalk.underline(plugin.id)}) already exists in the database.`));
			await updateOldEntry(plugin, allResponse, pageID, notion);
		} else {
			console.log(chalk.red(`Entry for ${plugin.name} (${chalk.underline(plugin.id)}) doesn't exist in the database.`));
			await addNewEntry(plugin, notion);
		}
	}
}

await main();