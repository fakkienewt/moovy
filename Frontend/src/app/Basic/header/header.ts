import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { ServiceGetData } from '../../Services/service-get-data';
import { Content } from '../../Models/ContentModel';
import { HostListener } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit, OnDestroy {
  searchQuery: string = '';
  searchResults: Content[] = [];
  allContent: Content[] = [];

  private routerSub!: Subscription;

  constructor(
    private router: Router,
    private contentService: ServiceGetData
  ) { }

  ngOnInit(): void {
    forkJoin({
      movies: this.contentService.getMovies(),
      series: this.contentService.getTVSeries(),
      anime: this.contentService.getAnime()
    }).subscribe({
      next: (data) => {
        const isValid = (i: any) => i.name && typeof i.name === 'string' && i.name.trim().length > 3;

        this.allContent = [
          ...(data.movies || []).filter(isValid),
          ...(data.series || []).filter(isValid),
          ...(data.anime || []).filter(isValid)
        ];
      },
      error: (err) => console.error('Ошибка загрузки:', err)
    });

    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.clearSearch();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: EventTarget | null): void {
    const inputGroup = document.querySelector('.input-group');

    if (targetElement instanceof HTMLElement && inputGroup) {
      if (!inputGroup.contains(targetElement)) {
        this.clearSearch();
      }
    }
  }

  onLogoClick(): void {
    this.router.navigate(['/']);
  }

  onSearchInput(val: string): void {
    this.searchQuery = val;

    if (!val || val.trim().length < 2) {
      this.searchResults = [];
      return;
    }

    const lowerVal = val.toLowerCase();
    this.searchResults = this.allContent
      .filter(item => item.name?.toLowerCase().includes(lowerVal))
      .slice(0, 7);
  }

  selectSearchResult(item: Content): void {
    const map: Record<string, string> = {
      'movie': 'movie',
      'tv-series': 'tv-series',
      'anime': 'anime'
    };

    const type = map[item.type || ''] || 'movie';
    this.router.navigate(['/content', type, item.id]);

    this.clearSearch();
  }

  private clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
  }

  handlePosterError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    if (img.parentElement) {
      img.parentElement.style.background = 'linear-gradient(135deg, #b3e0ff 0%, #87CEEB 100%)';
    }
  }
}