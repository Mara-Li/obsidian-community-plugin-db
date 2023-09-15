export interface PluginItems {
  id: string;
  name: string;
  description: string;
  repo: string;
  author: string;
}

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


export interface UpdateProperty {
  "Author" : RichText,
  "Description" : RichText,
  "Name" : RichText,
  "Repository" : PropertyURL
}