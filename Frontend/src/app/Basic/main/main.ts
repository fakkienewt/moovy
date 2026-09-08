import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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

  constructor(
    private movieService: ServiceGetData,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.isLoading = true;

    this.movieService.getMovies().subscribe({
      next: (data) => {
        this.allMovies = data || [];

        this.allAnime = this.allMovies.filter(m =>
          m.genres && m.genres.toLowerCase().includes('аниме')
        );

        this.allSeries = [];

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

  onSelectMovie(movie: Content): void {
    if (movie?.id) this.router.navigate(['/content', movie.id]);
  }

  onSelectSeries(series: Content): void {
    if (series?.id) this.router.navigate(['/content', series.id]);
  }

  onSelectAnime(anime: Content): void {
    if (anime?.id) this.router.navigate(['/content', anime.id]);
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