import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NewItems } from '../new-items/new-items';
import { ServiceGetData } from '../../Services/service-get-data';
import { Content } from '../../Models/ContentModel';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, NewItems],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main implements OnInit {
  activeTab: string = 'movie';
  allMovies: Content[] = [];
  allSeries: Content[] = [];
  allAnime: Content[] = [];

  paginatedMovies: Content[] = [];
  paginatedSeries: Content[] = [];
  paginatedAnime: Content[] = [];

  isLoading = true;
  currentPage = 1;
  itemsPerPage = 16;
  totalPages = 1;
  skeletonItems = Array.from({ length: 16 }, (_, i) => i);

  constructor(
    private movieService: ServiceGetData,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.isLoading = true;

    forkJoin({
      movies: this.movieService.getMovies(),
      series: this.movieService.getTVSeries()
    }).subscribe({
      next: (data) => {
        const rawMovies = data.movies || [];
        const rawSeries = data.series || [];

        const isValidItem = (item: any) => {
          const hasName = item.name && typeof item.name === 'string' && item.name.trim().length > 3;
          const hasPoster = item.poster && typeof item.poster === 'string' &&
            item.poster.trim().length > 10 &&
            !item.poster.includes('base64') &&
            !item.poster.includes('poster_none');
          return hasName && hasPoster;
        };

        this.allMovies = rawMovies
          .filter(isValidItem)
          .map(m => ({ ...m, type: 'movie' as const }));

        this.allSeries = rawSeries
          .filter(s =>
            isValidItem(s) &&
            !(s.genres && s.genres.toLowerCase().includes('аниме сериалы'))
          )
          .map(s => ({ ...s, type: 'tv-series' as const }));

        const animeMovies = rawMovies
          .filter(m => isValidItem(m) && m.genres && m.genres.toLowerCase().includes('аниме'))
          .map(m => ({ ...m, type: 'movie' as const }));

        const animeSeries = rawSeries
          .filter(s => isValidItem(s) && s.genres && s.genres.toLowerCase().includes('аниме сериалы'))
          .map(s => ({ ...s, type: 'tv-series' as const }));

        this.allAnime = [...animeMovies, ...animeSeries];

        this.updatePagination();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Ошибка загрузки:', err);
        this.isLoading = false;
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.updatePagination();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  backPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onSelectMovie(m: Content): void {
    if (m?.id) this.router.navigate(['/content', 'movie', m.id]);
  }

  onSelectSeries(s: Content): void {
    if (s?.id) this.router.navigate(['/content', 'tv-series', s.id]);
  }

  onSelectAnime(a: Content): void {
    if (a?.id) {
      const type = a.type === 'tv-series' ? 'tv-series' : 'movie';
      this.router.navigate(['/content', type, a.id]);
    }
  }

  private updatePagination(): void {
    let currentList: Content[] = [];

    switch (this.activeTab) {
      case 'movie': currentList = this.allMovies; break;
      case 'tvSeries': currentList = this.allSeries; break;
      case 'anime': currentList = this.allAnime; break;
    }

    this.totalPages = Math.ceil(currentList.length / this.itemsPerPage);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;

    this.paginatedMovies = [];
    this.paginatedSeries = [];
    this.paginatedAnime = [];

    if (this.activeTab === 'movie') this.paginatedMovies = currentList.slice(start, end);
    if (this.activeTab === 'tvSeries') this.paginatedSeries = currentList.slice(start, end);
    if (this.activeTab === 'anime') this.paginatedAnime = currentList.slice(start, end);
  }
}