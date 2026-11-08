import { ContentModel } from "./ContentModel";

export interface ContentResponseModel {
  items: ContentModel[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}