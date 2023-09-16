import { format,parseISO } from "date-fns";

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
	} else if (type === "funding" && plugin.fundingUrl) {
		return {
			type: "url",
			url: plugin.fundingUrl || ""
		} as PropertyURL;
	}
}

export function generateMobileTag(plugin: PluginItems) {
	if (!plugin.isDesktopOnly) {
		return [{
			name: "mobile",
			color: "green"
		}];
	}
	return [];
}

export function generateActivityTag(plugin: PluginItems) {
	const archived = {
		name: "#ARCHIVED",
		color: "orange"
	};
	const active = {
		name: "#ACTIVE",
		color: "blue"
	};
	const stale = {
		name: "#STALE",
		color: "yellow"
	};

	if (plugin.repoArchived) {
		return archived;
	} else if (plugin.lastCommitDate) {
		const lastCommitDate = new Date(plugin.lastCommitDate);
		const today = new Date();
		const diffTime = Math.abs(today.getTime() - lastCommitDate.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays > 365 ? stale : active;
	}
	return stale;
}

export function uniDate(date: Date | string | undefined) {
	if (!date) {
		return "";
	}
	if (typeof date === "string") {
		date = parseISO(date);
	}
	return format(date, "yyyy-MM-dd'T'HH:mm");
}