import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ServiceGetData } from '../../Services/service-get-data';
import { Content } from '../../Models/ContentModel';
import { Subscription } from 'rxjs';

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
  private allMoviesCache: Content[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ServiceGetData,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.contentService.getMovies().subscribe(items => {
      this.allMoviesCache = items;

      this.routeSub = this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.loadContent(+id);
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  loadContent(contentId: number): void {
    window.scrollTo(0, 0);

    this.content = this.allMoviesCache.find(m => m.id === contentId) || null;

    if (this.content) {
      this.loadPlayer(contentId);
      this.findSimilarMovies(this.content, this.allMoviesCache);
    } else {
      console.error(`Фильм с ID ${contentId} не найден в базе`);
    }
  }

  findSimilarMovies(currentMovie: Content, allMovies: Content[]): void {
    if (!currentMovie.genres) {
      this.similarMovies = [];
      return;
    }

    const currentGenres = currentMovie.genres.toLowerCase().split(',').map(g => g.trim());

    const scoredMovies = allMovies
      .filter(m => m.id !== currentMovie.id && m.genres)
      .map(movie => {
        const movieGenres = movie.genres!.toLowerCase().split(',').map(g => g.trim());
        const matchCount = movieGenres.filter(g => currentGenres.includes(g)).length;
        return { movie, score: matchCount };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    this.similarMovies = scoredMovies.map(item => item.movie);
  }

  loadPlayer(contentId: number): void {
    this.contentService.getPlayerLink(contentId).subscribe(res => {
      const url = res?.primary_player || (res?.players && res.players.length > 0 ? res.players[0] : null);
      if (url) {
        this.playerUrl = url;
        this.safePlayerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } else {
        this.playerUrl = null;
        this.safePlayerUrl = null;
      }
    }, error => {
      console.error('Ошибка загрузки плеера:', error);
      this.playerUrl = null;
      this.safePlayerUrl = null;
    });
  }

  toggleFavorite(): void {
    this.isFavorite = !this.isFavorite;
  }

  toggleLater(): void {
    this.isLater = !this.isLater;
  }

  onSelectContent(content: Content): void {
    if (content?.id) {
      this.router.navigate(['/content', content.id]);
    }
  }
}