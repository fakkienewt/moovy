import { ContentModel } from "./ContentModel";

export interface ProfileDataModel {
  content: ContentModel[];
  state: {
    watching_now: string[];
    watch_later: string[];
    watched: string[];
  };
}