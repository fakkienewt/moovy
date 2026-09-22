import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ServiceGetData } from '../../Services/service-get-data';
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
export class Main implements OnInit {
  activeTab: string = 'movie';
  isFilterOpen: boolean = false;
  sortType: string = 'default';

  filterType: string = '';
  selectedGenre: string = '';
  selectedYear: string = '';
  selectedCountry: string = '';
  directorSearch: string = '';
  actorSearch: string = '';

  allDirectors: string[] = [];
  allActors: string[] = [];
  filteredDirectorSuggestions: string[] = [];
  filteredActorSuggestions: string[] = [];

  genres: string[] = [];
  years: string[] = [];
  countries: string[] = [];

  allMovies: Content[] = [];
  allSeries: Content[] = [];
  allAnime: Content[] = [];

  paginatedMovies: Content[] = [];
  paginatedSeries: Content[] = [];
  paginatedAnime: Content[] = [];
  paginatedFiltered: Content[] = [];
  filteredResults: Content[] = [];

  isLoading = true;
  currentPage = 1;
  itemsPerPage = 16;
  totalPages = 1;
  skeletonItems = Array.from({ length: 16 }, (_, i) => i);

  private isRestoring = false;

  constructor(
    private contentService: ServiceGetData,
    private router: Router,
    private route: ActivatedRoute,
    private stateService: PaginationStateService
  ) { }

  ngOnInit(): void {
    const saved = this.stateService.load();

    this.isRestoring = true;

    if (saved.activeTab) this.activeTab = saved.activeTab;
    if (saved.currentPage && saved.currentPage > 0) this.currentPage = saved.currentPage;
    if (typeof saved.isFilterOpen === 'boolean') this.isFilterOpen = saved.isFilterOpen;
    if (saved.sortType) this.sortType = saved.sortType;
    if (saved.filterType) this.filterType = saved.filterType;
    if (saved.selectedGenre) this.selectedGenre = saved.selectedGenre;
    if (saved.selectedYear) this.selectedYear = saved.selectedYear;
    if (saved.selectedCountry) this.selectedCountry = saved.selectedCountry;
    if (saved.directorSearch) this.directorSearch = saved.directorSearch;
    if (saved.actorSearch) this.actorSearch = saved.actorSearch;

    this.isLoading = true;
    forkJoin({
      movies: this.contentService.getMovies(),
      series: this.contentService.getTVSeries(),
      anime: this.contentService.getAnime()
    }).subscribe({
      next: (data) => {
        const isValid = (i: any) => i.name && typeof i.name === 'string' && i.name.trim().length > 3 &&
          i.poster && typeof i.poster === 'string' && i.poster.trim().length > 10 &&
          !i.poster.includes('base64') && !i.poster.includes('poster_none');

        this.allMovies = (data.movies || []).filter(isValid);
        this.allSeries = (data.series || []).filter(isValid);
        this.allAnime = (data.anime || []).filter(isValid);

        this.extractGlobalOptions();

        if (this.isFilterOpen) {
          this.updateFilterOptions();
          this.applyFilters(true);
        } else {
          this.updatePagination();
        }

        this.isLoading = false;
        this.isRestoring = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.isRestoring = false;
      }
    });
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
    this.updatePagination();
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
      this.updateFilterOptions();
      this.applyFilters();
    } else {
      this.currentPage = 1;
      this.updatePagination();
      this.persist();
    }
  }

  extractGlobalOptions(): void {
    const all = [...this.allMovies, ...this.allSeries, ...this.allAnime];
    const dS = new Set<string>(), aS = new Set<string>();

    all.forEach(i => {
      if (i.directors) {
        i.directors.split(',').forEach(d => { const t = d.trim(); if (t) dS.add(t); });
      }
      if (i.actors) {
        i.actors.split(',').forEach(a => { const t = a.trim(); if (t) aS.add(t); });
      }
    });

    this.allDirectors = Array.from(dS).sort();
    this.allActors = Array.from(aS).sort();
  }

  updateFilterOptions(): void {
    this.closeDropdowns();
    let sourceList: Content[] = [];

    switch (this.filterType) {
      case 'movie': sourceList = this.allMovies; break;
      case 'tv-series': sourceList = this.allSeries; break;
      case 'anime': sourceList = this.allAnime; break;
      default: sourceList = [...this.allMovies, ...this.allSeries, ...this.allAnime];
    }

    const gS = new Set<string>(), yS = new Set<string>(), cS = new Set<string>();

    sourceList.forEach(i => {
      if (i.year) {
        yS.add(String(i.year));
      }
      if (i.genres) i.genres.split(',').forEach(g => {
        const t = g.trim();
        if (t && !['Фильмы', 'Сериалы'].includes(t)) gS.add(t);
      });
      if (i.countries) i.countries.split(',').forEach(c => {
        const t = c.trim();
        if (t) {
          cS.add(t);
        }
      });
    });

    this.genres = Array.from(gS).sort();
    this.years = Array.from(yS).sort((a, b) => Number(b) - Number(a));
    this.countries = Array.from(cS).sort();

    if (this.selectedGenre && !this.genres.includes(this.selectedGenre)) {
      this.selectedGenre = '';
    }
    if (this.selectedYear && !this.years.includes(this.selectedYear)) {
      this.selectedYear = '';
    }
    if (this.selectedCountry && !this.countries.includes(this.selectedCountry)) {
      this.selectedCountry = '';
    }
  }

  onDirectorInput(val: string): void {
    this.directorSearch = val;
    if (!val) {
      this.filteredDirectorSuggestions = []; return;
    }

    let sourceList: Content[] = [];
    switch (this.filterType) {
      case 'movie': sourceList = this.allMovies; break;
      case 'tv-series': sourceList = this.allSeries; break;
      case 'anime': sourceList = this.allAnime; break;
      default: sourceList = [...this.allMovies, ...this.allSeries, ...this.allAnime];
    }

    const availableDirectors = new Set<string>();

    sourceList.forEach(i => {
      if (i.directors) {
        i.directors.split(',').forEach(d => { const t = d.trim(); if (t) availableDirectors.add(t); });
      }
    });

    this.filteredDirectorSuggestions = Array.from(availableDirectors)
      .filter(d => d.toLowerCase().includes(val.toLowerCase()))
      .sort()
      .slice(0, 5);
  }

  onActorInput(val: string): void {
    this.actorSearch = val;
    if (!val) {
      this.filteredActorSuggestions = []; return;
    }

    let sourceList: Content[] = [];
    switch (this.filterType) {
      case 'movie': sourceList = this.allMovies; break;
      case 'tv-series': sourceList = this.allSeries; break;
      case 'anime': sourceList = this.allAnime; break;
      default: sourceList = [...this.allMovies, ...this.allSeries, ...this.allAnime];
    }

    const availableActors = new Set<string>();
    sourceList.forEach(i => {
      if (i.actors) i.actors.split(',').forEach(a => { const t = a.trim(); if (t) availableActors.add(t); });
    });

    this.filteredActorSuggestions = Array.from(availableActors)
      .filter(a => a.toLowerCase().includes(val.toLowerCase()))
      .sort()
      .slice(0, 5);
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

    let list: Content[] = [];

    switch (this.filterType) {
      case 'movie': list = [...this.allMovies]; break;
      case 'tv-series': list = [...this.allSeries]; break;
      case 'anime': list = [...this.allAnime]; break;
      default: list = [...this.allMovies, ...this.allSeries, ...this.allAnime];
    }

    if (this.selectedGenre) {
      list = list.filter(i => i.genres?.toLowerCase().includes(this.selectedGenre.toLowerCase()));
    }
    if (this.selectedYear) {
      list = list.filter(i => String(i.year) === this.selectedYear);
    }
    if (this.selectedCountry) {
      list = list.filter(i => i.countries?.toLowerCase().includes(this.selectedCountry.toLowerCase()));
    }

    if (this.directorSearch.trim()) {
      const dSearch = this.directorSearch.toLowerCase();
      list = list.filter(i => i.directors?.toLowerCase().includes(dSearch));
    }

    if (this.actorSearch.trim()) {
      const aSearch = this.actorSearch.toLowerCase();
      list = list.filter(i => i.actors?.toLowerCase().includes(aSearch));
    }

    if (this.sortType === 'rating_asc') {
      list.sort((a, b) => Number(a.rating || 0) - Number(b.rating || 0));
    } else if (this.sortType === 'rating_desc') {
      list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    }

    this.filteredResults = list;
    this.totalPages = Math.max(1, Math.ceil(list.length / this.itemsPerPage));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    this.updatePaginatedFiltered();
    this.persist();
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
    this.applyFilters();
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
      if (this.isFilterOpen) {
        this.updatePaginatedFiltered();
      }
      else {
        this.updatePagination();
      }

      this.persist();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  backPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      if (this.isFilterOpen) {
        this.updatePaginatedFiltered();
      }
      else {
        this.updatePagination();
      }

      this.persist();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private updatePagination(): void {
    if (this.isFilterOpen) {
      this.updatePaginatedFiltered();
      return;
    }

    let src: Content[] = [];
    switch (this.activeTab) {
      case 'movie': src = this.allMovies; break;
      case 'tvSeries': src = this.allSeries; break;
      case 'anime': src = this.allAnime; break;
    }
    this.totalPages = Math.max(1, Math.ceil(src.length / this.itemsPerPage));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const s = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedMovies = this.activeTab === 'movie' ? src.slice(s, s + this.itemsPerPage) : [];
    this.paginatedSeries = this.activeTab === 'tvSeries' ? src.slice(s, s + this.itemsPerPage) : [];
    this.paginatedAnime = this.activeTab === 'anime' ? src.slice(s, s + this.itemsPerPage) : [];
  }

  private updatePaginatedFiltered(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredResults.length / this.itemsPerPage));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const s = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedFiltered = this.filteredResults.slice(s, s + this.itemsPerPage);
  }
}