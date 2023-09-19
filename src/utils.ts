import { format,parseISO } from "date-fns";

import { MultiSelect,PluginItems, PropertyURL, RichText } from "./interface";


/**
 * Generate the different property for the plugin when a plugin must be updated
 * @param plugin {PluginItems} - The plugin to update
 * @param type {"author" | "description" | "repo" | "name" | "funding" | "ETAG"} - The property to update
 * @returns {RichText | PropertyURL | MultiSelect | undefined}
 */
export function generateRichText(plugin: PluginItems, type: "author" | "description" | "repo" | "name" | "funding" | "ETAG"): RichText | PropertyURL | MultiSelect | undefined {
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
	} else if (type === "funding" && plugin.fundingUrl) {
		return {
			type: "url",
			url: plugin.fundingUrl || ""
		} as PropertyURL;
	} else if (type === "ETAG") {
		return {
			type: "rich_text",
			rich_text: [
				{
					type: "text",
					text: {
						content: plugin.ETAG,
					}
				}
			]
		} as RichText;
	}
}

/**
 * Generate the tag for the plugin desktop only based on plugin.isDesktopOnly
 * @param plugin {PluginItems} - The plugin to check
 * @returns {{name: string, color: string}[]} - The tag
 */
export function generateMobileTag(plugin: PluginItems): MultiSelect[] {
	if (!plugin.isDesktopOnly) {
		return [{
			name: "mobile",
			color: "green"
		}];
	}
	return [];
}

/**
 * Generate the tag for the plugin activity based on plugin.lastCommitDate
 * @param plugin {PluginItems} - The plugin to check
 * @returns {MultiSelect} - The tag
 */
export function generateActivityTag(plugin: PluginItems): MultiSelect {
	const active = {
		name: "#ACTIVE",
		color: "blue"
	};
	const stale = {
		name: "#STALE",
		color: "yellow"
	};

	if (plugin.lastCommitDate) {
		const lastCommitDate = new Date(plugin.lastCommitDate);
		const today = new Date();
		const diffTime = Math.abs(today.getTime() - lastCommitDate.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays > 365 ? stale : active;
	}
	return stale;
}

/**
 * Universal date format for comparaison between the plugin.lastCommitDate and the property "Last commit"
 * @param date {Date | string | undefined} - The date to format
 * @returns {string} - The date in the format yyyy-MM-dd'T'HH:mm
 */
export function uniDate(date: Date | string | undefined) {
	if (!date) {
		return "";
	}
	if (typeof date === "string") {
		date = parseISO(date);
	}
	return format(date, "yyyy-MM-dd'T'HH:mm");
}