export interface ContentQueryModel {
  type?: string;
  page?: number;
  limit?: number;
  genre?: string;
  year?: string | number;
  country?: string;
  director?: string;
  actor?: string;
  search?: string;
  sort?: string;
}