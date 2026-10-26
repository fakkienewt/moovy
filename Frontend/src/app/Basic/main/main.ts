import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ContentQuery, ServiceGetData } from '../../Services/service-get-data';
import { Content } from '../../Models/ContentModel';
import { NewItems } from '../new-items/new-items';
import { PaginationStateService } from '../../Services/pagination-state-service';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, FormsModule, NewItems],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main implements OnInit, OnDestroy {
  activeTab: string = 'movie';
  isFilterOpen: boolean = false;
  sortType: string = 'default';

  filterType: string = '';
  selectedGenre: string = '';
  selectedYear: string = '';
  selectedCountry: string = '';
  directorSearch: string = '';
  actorSearch: string = '';

  filteredDirectorSuggestions: string[] = [];
  filteredActorSuggestions: string[] = [];

  genres: string[] = [];
  years: string[] = [];
  countries: string[] = [];

  paginatedList: Content[] = [];

  isLoading = true;
  currentPage = 1;
  itemsPerPage = 16;
  totalPages = 1;
  skeletonItems = Array.from({ length: 16 }, (_, i) => i);

  private itemsRequestId = 0;
  private optionsRequestId = 0;
  private directorSuggestionsSub?: Subscription;
  private actorSuggestionsSub?: Subscription;

  constructor(
    private contentService: ServiceGetData,
    private router: Router,
    private stateService: PaginationStateService
  ) { }

  ngOnInit(): void {
    const saved = this.stateService.load();

    if (saved.activeTab) {
      this.activeTab = saved.activeTab;
    };
    if (saved.currentPage && saved.currentPage > 0) {
      this.currentPage = saved.currentPage;
    };
    if (typeof saved.isFilterOpen === 'boolean') {
      this.isFilterOpen = saved.isFilterOpen;
    };
    if (saved.sortType) {
      this.sortType = saved.sortType;
    };
    if (saved.filterType) {
      this.filterType = saved.filterType;
    };
    if (saved.selectedGenre) {
      this.selectedGenre = saved.selectedGenre;
    };
    if (saved.selectedYear) {
      this.selectedYear = saved.selectedYear;
    };
    if (saved.selectedCountry) {
      this.selectedCountry = saved.selectedCountry;
    };
    if (saved.directorSearch) {
      this.directorSearch = saved.directorSearch;
    };
    if (saved.actorSearch) {
      this.actorSearch = saved.actorSearch;
    };

    this.loadItems();

    if (this.isFilterOpen) {
      this.loadFilterOptions();
    }
  }

  ngOnDestroy(): void {
    this.directorSuggestionsSub?.unsubscribe();
    this.actorSuggestionsSub?.unsubscribe();
  }

  private persist(): void {
    this.stateService.save({
      activeTab: this.activeTab,
      currentPage: this.currentPage,
      isFilterOpen: this.isFilterOpen,
      sortType: this.sortType,
      filterType: this.filterType,
      selectedGenre: this.selectedGenre,
      selectedYear: this.selectedYear,
      selectedCountry: this.selectedCountry,
      directorSearch: this.directorSearch,
      actorSearch: this.actorSearch
    });
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (target instanceof HTMLElement && !target.closest('.filter-panel')) {
      this.filteredDirectorSuggestions = [];
      this.filteredActorSuggestions = [];
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.isFilterOpen = false;
    this.currentPage = 1;
    this.loadItems();
    this.persist();
  }

  toggleFilter(): void {
    this.isFilterOpen = !this.isFilterOpen;

    if (this.isFilterOpen) {
      this.filterType = '';
      this.sortType = 'default';
      this.filteredDirectorSuggestions = [];
      this.filteredActorSuggestions = [];
      this.directorSearch = '';
      this.actorSearch = '';
      this.currentPage = 1;
      this.updateFilterOptions();
      this.applyFilters();
    } else {
      this.currentPage = 1;
      this.loadItems();
      this.persist();
    }
  }

  private activeType(): string {
    switch (this.activeTab) {
      case 'tvSeries': return 'tv-series';
      case 'anime': return 'anime';
      default: return 'movie';
    }
  }

  private loadItems(): void {
    const requestId = ++this.itemsRequestId;
    this.isLoading = true;

    const params: ContentQuery = {
      type: this.isFilterOpen ? this.filterType : this.activeType(),
      page: this.currentPage,
      limit: this.itemsPerPage
    };

    if (this.isFilterOpen) {
      params.genre = this.selectedGenre;
      params.year = this.selectedYear;
      params.country = this.selectedCountry;
      params.director = this.directorSearch;
      params.actor = this.actorSearch;
      params.sort = this.sortType;
    }

    this.contentService.getContent(params).subscribe({
      next: (response) => {
        if (requestId !== this.itemsRequestId) {
          return;
        }

        this.paginatedList = response.items || [];
        this.currentPage = response.currentPage || 1;
        this.totalPages = Math.max(1, response.totalPages || 1);
        this.isLoading = false;
        this.persist();
      },
      error: (err) => {
        if (requestId !== this.itemsRequestId) {
          return;
        }

        console.error(err);
        this.paginatedList = [];
        this.totalPages = 1;
        this.isLoading = false;
      }
    });
  }

  private loadFilterOptions(): void {
    const requestId = ++this.optionsRequestId;

    this.contentService.getFilterOptions(this.filterType).subscribe({
      next: (options) => {
        if (requestId !== this.optionsRequestId) {
          return;
        }

        this.genres = options.genres || [];
        this.years = options.years || [];
        this.countries = options.countries || [];

        let changed = false;

        if (this.selectedGenre && !this.genres.includes(this.selectedGenre)) {
          this.selectedGenre = '';
          changed = true;
        }
        if (this.selectedYear && !this.years.includes(this.selectedYear)) {
          this.selectedYear = '';
          changed = true;
        }
        if (this.selectedCountry && !this.countries.includes(this.selectedCountry)) {
          this.selectedCountry = '';
          changed = true;
        }

        if (changed) {
          this.currentPage = 1;
          this.loadItems();
        }
      },
      error: (err) => console.error(err)
    });
  }

  updateFilterOptions(): void {
    this.closeDropdowns();
    this.loadFilterOptions();
  }

  onDirectorInput(val: string): void {
    this.directorSearch = val;
    this.directorSuggestionsSub?.unsubscribe();

    if (!val.trim()) {
      this.filteredDirectorSuggestions = [];
      return;
    }

    this.directorSuggestionsSub = this.contentService
      .getSuggestions('director', val, this.filterType, 5)
      .subscribe({
        next: suggestions => this.filteredDirectorSuggestions = suggestions,
        error: (err) => {
          console.error(err);
          this.filteredDirectorSuggestions = [];
        }
      });
  }

  onActorInput(val: string): void {
    this.actorSearch = val;
    this.actorSuggestionsSub?.unsubscribe();

    if (!val.trim()) {
      this.filteredActorSuggestions = [];
      return;
    }

    this.actorSuggestionsSub = this.contentService
      .getSuggestions('actor', val, this.filterType, 5)
      .subscribe({
        next: suggestions => this.filteredActorSuggestions = suggestions,
        error: (err) => {
          console.error(err);
          this.filteredActorSuggestions = [];
        }
      });
  }

  selectSuggestion(type: 'director' | 'actor', value: string): void {
    if (type === 'director') {
      this.directorSearch = value;
      this.filteredDirectorSuggestions = [];
    } else {
      this.actorSearch = value;
      this.filteredActorSuggestions = [];
    }
    this.applyFilters();
  }

  closeDropdowns(): void {
    (document.activeElement as HTMLElement)?.blur();
    this.filteredDirectorSuggestions = [];
    this.filteredActorSuggestions = [];
  }

  applyFilters(preservePage = false): void {
    this.closeDropdowns();

    if (!preservePage) {
      this.currentPage = 1;
    }

    this.loadItems();
  }

  resetFilters(): void {
    this.filterType = '';
    this.selectedGenre = '';
    this.selectedYear = '';
    this.selectedCountry = '';
    this.directorSearch = '';
    this.actorSearch = '';
    this.sortType = 'default';
    this.filteredDirectorSuggestions = [];
    this.filteredActorSuggestions = [];
    this.currentPage = 1;
    this.updateFilterOptions();
    this.loadItems();
  }

  onSelectItem(item: Content): void {
    this.persist();
    const map: Record<string, string> = { 'movie': 'movie', 'tv-series': 'tv-series', 'anime': 'anime' };
    if (item?.id) {
      this.router.navigate(['/content', map[item.type || ''] || 'movie', item.id]);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadItems();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  backPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadItems();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  get currentList(): Content[] {
    return this.paginatedList;
  }

  get filteredResults(): Content[] {
    return this.paginatedList;
  }

  get emptyMessage(): string {
    switch (this.activeTab) {
      case 'movie': return 'Ой! Фильмы пока не найдены';
      case 'tvSeries': return 'Упс! Сериалы еще не добавлены';
      case 'anime': return 'Хмм... Аниме пока пусто';
      default: return 'Ничего не найдено';
    }
  }

  onDirectorFocus(): void {
    this.filteredActorSuggestions = [];
  }

  onActorFocus(): void {
    this.filteredDirectorSuggestions = [];
  }
}
