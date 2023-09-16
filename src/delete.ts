import { Client } from "@notionhq/client";
import chalk from "chalk";

import { DeletedPlugins } from "./interface";

export async function deletePageID(deletedPlugin: DeletedPlugins, notion: Client) {
	await notion.pages.update({
		page_id: deletedPlugin.id,
		archived: true,
	});
	console.log(chalk.italic(`Page ${deletedPlugin.pluginName} (${chalk.underline(deletedPlugin.pluginID)}) archived.`));
}