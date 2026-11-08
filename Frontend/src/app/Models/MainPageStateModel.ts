export interface MainPageStateModel {
  activeTab: string;
  currentPage: number;
  isFilterOpen: boolean;
  sortType: string;
  filterType: string;
  selectedGenre: string;
  selectedYear: string;
  selectedCountry: string;
  directorSearch: string;
  actorSearch: string;
}