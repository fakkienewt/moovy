import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ServiceGetData } from '../../Services/service-get-data';
import { ContentModel } from '../../Models/ContentModel';
import { NewItems } from '../new-items/new-items';
import { ServicePaginationState } from '../../Services/service-pagination-state';
import { ContentQueryModel } from '../../Models/ContentQueryModel';
import { FilterOptionsModel } from '../../Models/FilterOptionsModel';
import { ContentResponseModel } from '../../Models/ContentResponseModel';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, FormsModule, NewItems],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main implements OnInit, OnDestroy {
  active_tab: string = 'movie';
  is_filter_open: boolean = false;
  sort_type: string = 'default';

  filter_type: string = '';
  selected_genre: string = '';
  selected_year: string = '';
  selected_country: string = '';
  director_search: string = '';
  actor_search: string = '';

  filtered_director_suggestions: string[] = [];
  filtered_actor_suggestions: string[] = [];

  genres: string[] = [];
  years: string[] = [];
  countries: string[] = [];

  paginated_list: ContentModel[] = [];

  is_loading = true;
  current_page = 1;
  items_per_page = 16;
  total_pages = 1;
  skeleton_items = Array.from({ length: 16 }, (_, i) => i);

  private items_request_id = 0;
  private options_request_id = 0;
  private director_suggestions_sub?: Subscription;
  private actor_suggestions_sub?: Subscription;

  constructor(
    private service_content: ServiceGetData,
    private router: Router,
    private pagination_state_service: ServicePaginationState
  ) { }

  ngOnInit(): void {
    let saved_state = this.pagination_state_service.loadState();

    if (saved_state.activeTab) {
      this.active_tab = saved_state.activeTab;
    }
    if (saved_state.currentPage && saved_state.currentPage > 0) {
      this.current_page = saved_state.currentPage;
    }
    if (typeof saved_state.isFilterOpen === 'boolean') {
      this.is_filter_open = saved_state.isFilterOpen;
    }
    if (saved_state.sortType) {
      this.sort_type = saved_state.sortType;
    }
    if (saved_state.filterType) {
      this.filter_type = saved_state.filterType;
    }
    if (saved_state.selectedGenre) {
      this.selected_genre = saved_state.selectedGenre;
    }
    if (saved_state.selectedYear) {
      this.selected_year = saved_state.selectedYear;
    }
    if (saved_state.selectedCountry) {
      this.selected_country = saved_state.selectedCountry;
    }
    if (saved_state.directorSearch) {
      this.director_search = saved_state.directorSearch;
    }
    if (saved_state.actorSearch) {
      this.actor_search = saved_state.actorSearch;
    }

    this.LoadItems();

    if (this.is_filter_open) {
      this.LoadFilterOptions();
    }
  }

  ngOnDestroy(): void {
    this.director_suggestions_sub?.unsubscribe();
    this.actor_suggestions_sub?.unsubscribe();
  }

  private SavePageState(): void {
    this.pagination_state_service.saveState({
      activeTab: this.active_tab,
      currentPage: this.current_page,
      isFilterOpen: this.is_filter_open,
      sortType: this.sort_type,
      filterType: this.filter_type,
      selectedGenre: this.selected_genre,
      selectedYear: this.selected_year,
      selectedCountry: this.selected_country,
      directorSearch: this.director_search,
      actorSearch: this.actor_search
    });
  }

  @HostListener('document:click', ['$event.target'])
  OnDocumentClick(target_element: EventTarget | null): void {
    if (target_element instanceof HTMLElement && !target_element.closest('.filter-panel')) {
      this.filtered_director_suggestions = [];
      this.filtered_actor_suggestions = [];
    }
  }

  SetActiveTab(tab_name: string): void {
    this.active_tab = tab_name;
    this.is_filter_open = false;
    this.current_page = 1;
    this.LoadItems();
    this.SavePageState();
  }

  SwitchFilter(): void {
    this.is_filter_open = !this.is_filter_open;

    if (this.is_filter_open) {
      this.filter_type = '';
      this.sort_type = 'default';
      this.filtered_director_suggestions = [];
      this.filtered_actor_suggestions = [];
      this.director_search = '';
      this.actor_search = '';
      this.current_page = 1;
      this.UpdateFilterOptions();
      this.ApplyFilters();
    } else {
      this.current_page = 1;
      this.LoadItems();
      this.SavePageState();
    }
  }

  private GetActiveType(): string {
    if (this.active_tab === 'tvSeries') {
      return 'tv-series';
    }
    if (this.active_tab === 'anime') {
      return 'anime';
    }

    return 'movie';
  }

  private LoadItems(): void {
    this.items_request_id++;
    let current_request_id = this.items_request_id;
    this.is_loading = true;

    let query_params: ContentQueryModel = {
      type: this.is_filter_open ? this.filter_type : this.GetActiveType(),
      page: this.current_page,
      limit: this.items_per_page
    };

    if (this.is_filter_open) {
      query_params.genre = this.selected_genre;
      query_params.year = this.selected_year;
      query_params.country = this.selected_country;
      query_params.director = this.director_search;
      query_params.actor = this.actor_search;
      query_params.sort = this.sort_type;
    }

    this.service_content.GetPaginatedContent(query_params).subscribe({
      next: (response: ContentResponseModel) => {
        if (current_request_id !== this.items_request_id) return;

        this.paginated_list = response.items || [];
        this.current_page = response.currentPage || 1;
        this.total_pages = Math.max(1, response.totalPages || 1);
        this.is_loading = false;
        this.SavePageState();
      },
      error: (error: any) => {
        if (current_request_id !== this.items_request_id) return;
        console.error(error);
        this.paginated_list = [];
        this.total_pages = 1;
        this.is_loading = false;
      }
    });
  }

  private LoadFilterOptions(): void {
    this.options_request_id++;
    let current_request_id = this.options_request_id;

    this.service_content.GetFilterOptions(this.filter_type).subscribe({
      next: (options: FilterOptionsModel) => {
        if (current_request_id !== this.options_request_id) {
          return;
        }

        this.genres = options.genres || [];
        this.years = options.years || [];
        this.countries = options.countries || [];

        let is_changed = false;

        if (this.selected_genre && !this.genres.includes(this.selected_genre)) {
          this.selected_genre = '';
          is_changed = true;
        }
        if (this.selected_year && !this.years.includes(this.selected_year)) {
          this.selected_year = '';
          is_changed = true;
        }
        if (this.selected_country && !this.countries.includes(this.selected_country)) {
          this.selected_country = '';
          is_changed = true;
        }

        if (is_changed) {
          this.current_page = 1;
          this.LoadItems();
        }
      },
      error: (error: any) => console.error(error)
    });
  }

  UpdateFilterOptions(): void {
    this.CloseDropdowns();
    this.LoadFilterOptions();
  }

  OnDirectorInput(input_value: string): void {
    this.director_search = input_value;
    this.director_suggestions_sub?.unsubscribe();

    if (!input_value.trim()) {
      this.filtered_director_suggestions = [];
      return;
    }

    this.director_suggestions_sub = this.service_content
      .GetSuggestions('director', input_value, this.filter_type, 5)
      .subscribe({
        next: (suggestions: string[]) => this.filtered_director_suggestions = suggestions,
        error: (error: any) => {
          console.error(error);
          this.filtered_director_suggestions = [];
        }
      });
  }

  OnActorInput(input_value: string): void {
    this.actor_search = input_value;
    this.actor_suggestions_sub?.unsubscribe();

    if (!input_value.trim()) {
      this.filtered_actor_suggestions = [];
      return;
    }

    this.actor_suggestions_sub = this.service_content
      .GetSuggestions('actor', input_value, this.filter_type, 5)
      .subscribe({
        next: (suggestions: string[]) => this.filtered_actor_suggestions = suggestions,
        error: (error: any) => {
          console.error(error);
          this.filtered_actor_suggestions = [];
        }
      });
  }

  SelectSuggestion(suggestion_type: 'director' | 'actor', value: string): void {
    if (suggestion_type === 'director') {
      this.director_search = value;
      this.filtered_director_suggestions = [];
    } else {
      this.actor_search = value;
      this.filtered_actor_suggestions = [];
    }

    this.ApplyFilters();
  }

  CloseDropdowns(): void {
    (document.activeElement as HTMLElement)?.blur();
    this.filtered_director_suggestions = [];
    this.filtered_actor_suggestions = [];
  }

  ApplyFilters(preserve_page = false): void {
    this.CloseDropdowns();

    if (!preserve_page) {
      this.current_page = 1;
    }

    this.LoadItems();
  }

  ResetFilters(): void {
    this.filter_type = '';
    this.selected_genre = '';
    this.selected_year = '';
    this.selected_country = '';
    this.director_search = '';
    this.actor_search = '';
    this.sort_type = 'default';
    this.filtered_director_suggestions = [];
    this.filtered_actor_suggestions = [];
    this.current_page = 1;
    this.UpdateFilterOptions();
    this.LoadItems();
  }

  OnSelectItem(item: ContentModel): void {
    this.SavePageState();
    let content_type = item.type || 'movie';

    if (item?.id) {
      this.router.navigate(['/content', content_type, item.id]);
    }
  }

  NextPage(): void {
    if (this.current_page < this.total_pages) {
      this.current_page++;
      this.LoadItems();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  BackPage(): void {
    if (this.current_page > 1) {
      this.current_page--;
      this.LoadItems();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  GetEmptyMessage(): string {
    if (this.active_tab === 'movie') {
      return 'Ой! Фильмы пока не найдены';
    }
    if (this.active_tab === 'tvSeries') {
      return 'Упс! Сериалы еще не добавлены';
    }
    if (this.active_tab === 'anime') {
      return 'Хмм... Аниме пока пусто';
    }
    return 'Ничего не найдено';
  }

  OnDirectorFocus(): void {
    this.filtered_actor_suggestions = [];
  }

  OnActorFocus(): void {
    this.filtered_director_suggestions = [];
  }
}