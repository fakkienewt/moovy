import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ServiceGetData } from '../../Services/service-get-data';
import { Content } from '../../Models/ContentModel';

@Component({
  selector: 'app-content-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-page.html',
  styleUrl: './content-page.scss'
})
export class ContentPage implements OnInit, OnDestroy {
  content: Content | null = null;
  similarMovies: Content[] = [];
  isFavorite = false;
  isLater = false;

  playerUrl: string | null = null;
  safePlayerUrl: SafeResourceUrl | null = null;

  private navSub!: Subscription;
  private cacheLoaded = false;
  private allContentCache: Content[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ServiceGetData,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.navSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.handleRoute();
    });

    forkJoin({
      movies: this.contentService.getMovies(),
      series: this.contentService.getTVSeries(),
      anime: this.contentService.getAnime()
    }).subscribe({
      next: (data) => {
        this.allContentCache = [
          ...(data.movies || []),
          ...(data.series || []),
          ...(data.anime || [])
        ];
        this.cacheLoaded = true;
        this.handleRoute();
      },
      error: (err) => console.error('Ошибка загрузки кэша:', err)
    });
  }

  ngOnDestroy(): void {
    if (this.navSub) {
      this.navSub.unsubscribe()
    };
  }

  private handleRoute(): void {
    if (!this.cacheLoaded) {
      return;
    }

    const urlParts = this.router.url.split('/');
    if (urlParts[1] === 'content' && urlParts[3]) {
      const type = urlParts[2];
      const id = +urlParts[3];
      if (!isNaN(id)) {
        this.loadContent(id, type)
      };
    }
  }

  loadContent(contentId: number, typeFromRoute: string | null): void {
    window.scrollTo(0, 0);

    let wantedType: 'movie' | 'tv-series' | 'anime' = 'movie';
    
    if (typeFromRoute === 'tv-series') {
      wantedType = 'tv-series'
    }
    else if (typeFromRoute === 'anime') {
      wantedType = 'anime'
    };

    const foundItem = this.allContentCache.find(
      m => m.id === contentId && m.type === wantedType
    );

    if (!foundItem) {
      console.error(`Контент ${wantedType} с ID ${contentId} не найден`);
      this.content = null;
      this.playerUrl = null;
      this.safePlayerUrl = null;
      return;
    }

    this.content = { ...foundItem };

    if (!this.content.directors?.trim()) {
      this.content.directors = 'Неизвестно'
    };
    if (!this.content.actors?.trim()) {
      this.content.actors = 'Неизвестно'
    };
    if (!this.content.countries?.trim()) {
      this.content.countries = 'Неизвестно'
    };
    if (!this.content.genres?.trim()) {
      this.content.genres = 'Неизвестно'
    };
    if (!this.content.year) {
      this.content.year = 0
    };

    let apiSource = 'movies';
    if (wantedType === 'tv-series') {
      apiSource = 'tv-series'
    }
    else if (wantedType === 'anime') {
      apiSource = 'anime'
    };

    this.loadPlayer(contentId, apiSource);
    this.findSimilarMovies(this.content, this.allContentCache);
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none'
    };
  }

  loadPlayer(contentId: number, source: string): void {
    this.contentService.getPlayerLink(contentId, source).subscribe({
      next: (res) => {
        const url = res?.primary_player ||
          (res?.players && res.players.length > 0 ? res.players[0] : null);
        if (url) {
          this.playerUrl = url;
          this.safePlayerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        } else {
          this.playerUrl = null;
          this.safePlayerUrl = null;
        }
      },
      error: (err) => {
        console.error('Ошибка плеера:', err);
        this.playerUrl = null;
        this.safePlayerUrl = null;
      }
    });
  }

  findSimilarMovies(currentMovie: Content, allContent: Content[]): void {
    if (!currentMovie.genres || currentMovie.genres === 'Неизвестно') {
      this.similarMovies = [];
      return;
    }

    const currentGenres = currentMovie.genres.toLowerCase().split(',').map(g => g.trim());
    const currentType = currentMovie.type;

    const shuffle = (array: any[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    const scoredMovies = allContent
      .filter(m =>
        m.id !== currentMovie.id &&
        m.type === currentType &&
        m.genres &&
        m.genres !== 'Неизвестно'
      )
      .map(movie => {
        const movieGenres = movie.genres!.toLowerCase().split(',').map(g => g.trim());
        const matchCount = movieGenres.filter(g => currentGenres.includes(g)).length;
        return { movie, score: matchCount };
      })
      .filter(item => item.score > 0);

    const shuffled = shuffle(scoredMovies);
    this.similarMovies = shuffled.slice(0, 4).map(item => item.movie);
  }

  toggleFavorite(): void { this.isFavorite = !this.isFavorite; }
  toggleLater(): void { this.isLater = !this.isLater; }

  onSelectContent(content: Content): void {
    let type = 'movie';
    if (content.type === 'tv-series') {
      type = 'tv-series';
    }
    else if (content.type === 'anime') {
      type = 'anime'
    };
    this.router.navigate(['/content', type, content.id]);
  }
}

