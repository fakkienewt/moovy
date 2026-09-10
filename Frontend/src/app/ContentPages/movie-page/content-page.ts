import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, Subscription } from 'rxjs';
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

  private routeSub!: Subscription;
  private allContentCache: Content[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ServiceGetData,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    forkJoin({
      movies: this.contentService.getMovies(),
      series: this.contentService.getTVSeries()
    }).subscribe({
      next: (data) => {
        this.allContentCache = [...(data.movies || []), ...(data.series || [])];

        this.routeSub = this.route.paramMap.subscribe(params => {
          const id = params.get('id');
          const type = params.get('type');
          if (id) this.loadContent(+id, type);
        });
      },
      error: (err) => console.error('Ошибка загрузки контента:', err)
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  loadContent(contentId: number, typeFromRoute: string | null): void {
    window.scrollTo(0, 0);

    const wantedType: 'movie' | 'tv-series' =
      typeFromRoute === 'tv-series' ? 'tv-series' : 'movie';

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

    if (!this.content.directors?.trim()) this.content.directors = 'Неизвестно';
    if (!this.content.actors?.trim()) this.content.actors = 'Неизвестно';
    if (!this.content.countries?.trim()) this.content.countries = 'Неизвестно';
    if (!this.content.genres?.trim()) this.content.genres = 'Неизвестно';
    if (!this.content.year) this.content.year = 0;

    const source = wantedType === 'tv-series' ? 'tv-series' : 'movies';
    this.loadPlayer(contentId, source);
    this.findSimilarMovies(this.content, this.allContentCache);
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) img.style.display = 'none';
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
    if (content?.id) {
      const type = content.type === 'tv-series' ? 'tv-series' : 'movie';
      this.router.navigate(['/content', type, content.id]);
    }
  }
}