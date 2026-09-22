import { Injectable } from '@angular/core';

export interface MainState {
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

@Injectable({
  providedIn: 'root',
})
export class PaginationStateService {
  private readonly KEY = 'main_state';

  save(state: Partial<MainState>): void {
    try {
      const current = this.load();
      const merged = { ...current, ...state };
      sessionStorage.setItem(this.KEY, JSON.stringify(merged));
    } catch { /* ignore */ }
  }

  load(): Partial<MainState> {
    try {
      const raw = sessionStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  clear(): void {
    sessionStorage.removeItem(this.KEY);
  }
}