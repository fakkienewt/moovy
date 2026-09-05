export interface MovieNew {
    id: number;
    name: string;
    year: number;
    poster: string;
    rating?: number | string;
    actors?: string;
    directors?: string;
    countries?: string;
    genres?: string;
    time?: string;
    description?: string;
}