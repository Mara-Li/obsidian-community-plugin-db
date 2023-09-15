import { PluginItems, PropertyURL, RichText } from "./interface";

export function generateRichText(plugin: PluginItems, type: "author" | "description" | "repo" | "name" | "funding") {
	if (type === "author") {
		return {
			type: "rich_text",
			rich_text: [
				{
					type: "text",
					text: {
						content: plugin.author,
					}
				}
			]
		} as RichText;
	} else if (type === "description") {
		return {
			type: "rich_text",
			rich_text: [
				{
					type: "text",
					text: {
						content: plugin.description,
					}
				}
			]
		} as RichText;
	} else if (type === "name") {
		return {
			type: "rich_text",
			rich_text: [
				{
					type: "text",
					text: {
						content: plugin.name,
					}
				}
			]
		} as RichText;
	} else if (type === "repo") {
		return {
			type: "url",
			url: `https://github.com/${plugin.repo}`
		} as PropertyURL;
	} else if (type === "funding") {
		return {
			type: "url",
			url: plugin.fundingUrl || ""
		} as PropertyURL;
	}
}
