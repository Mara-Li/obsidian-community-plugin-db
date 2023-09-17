export interface PluginItems {
	id: string;
	name: string;
	description: string;
	repo: string;
	author: string;
	fundingUrl?: string;
	isDesktopOnly?: boolean;
	lastCommitDate?: Date | string;
	ETAG?: string;
}

export const TEST_PLUGIN: PluginItems = {
	author: "mara-li",
	id: "test",
	name: "Test",
	description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris. Maecenas congue ligula ac quam viverra nec consectetur ante hendrerit. Donec et mollis dolor.",
	repo: "test/test",
	fundingUrl: "coucou",
	isDesktopOnly: false,
	lastCommitDate: new Date(),
};

export interface RichText {
	type: string;
	rich_text: {
		type: string;
		text: {
			content: string;
		};
	}[];
}

export interface PropertyURL {
	type: string;
	url: string;
}

export type MultiSelect = {
	id?: string;
	name: string;
	color?: string;
};

export interface UpdateProperty {
	"Author": RichText,
	"Description": RichText,
	"Name": RichText,
	"Repository": PropertyURL,
	"Funding": PropertyURL,
	"Tags": MultiSelect[],
	"Last commit" : PropertyDate,
	"Repository status" : MultiSelect,
	"ETAG" : RichText,
}

export interface PropertyDate {
	type: string;
	date: {
		start: string;
		end?: string | null;
	};
}
export interface DeletedPlugins {
	id: string;
	pluginID: string;
	pluginName: string;
}

export interface PluginCommitDate {
	id: string;
	ETAG: string;
	commitDate: string;
}
export const ARCHIVED: MultiSelect = {
	name: "#ARCHIVED",
	color: "orange",
};