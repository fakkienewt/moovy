import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ServiceGetData } from '../../Services/service-get-data';
import { Content } from '../../Models/ContentModel';
import { FormsModule } from '@angular/forms';
import { AuthStateService } from '../../Services/auth-state-service';

interface AuthNotice {
  id: number;
  title: string;
  text: string;
  visible: boolean;
  leaving: boolean;
}

interface Comment {
  id: number;
  author: string;
  text: string;
  date: string;
}

@Component({
  selector: 'app-content-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './content-page.html',
  styleUrl: './content-page.scss'
})
export class ContentPage implements OnInit, OnDestroy {
  content: Content | null = null;
  similarMovies: Content[] = [];
  isLoadingSimilar = true;
  skeletonSimilarItems = Array.from({ length: 4 }, (_, i) => i);
  isWatchingNow = false;
  isLater = false;
  isWatched = false;

  authNotices: AuthNotice[] = [];

  comments: Comment[] = [];
  commentText = '';

  userName = 'Пользователь';

  playerUrl: string | null = null;
  safePlayerUrl: SafeResourceUrl | null = null;
  isPlayerLoading = true;

  private navSub!: Subscription;
  private noticeTimers = new Map<number, any>();
  private noticeIdCounter = 0;
  private cacheLoaded = false;
  private allContentCache: Content[] = [];

  private pendingNotice: { title: string; text: string } | null = null;

  private readonly NOTICE_LIMIT = 5;
  private readonly NOTICE_LIFETIME = 10000;
  private readonly NOTICE_LEAVE_DELAY = 280;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ServiceGetData,
    private sanitizer: DomSanitizer,
    private auth: AuthStateService
  ) { }

  onPlayerLoad(): void {
    const iframe = document.querySelector('.content-player-iframe');
    if (iframe) {
      iframe.classList.add('loaded');
    }
    setTimeout(() => {
      this.isPlayerLoading = false;
    }, 400);
  }

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
      this.navSub.unsubscribe();
    }
    this.noticeTimers.forEach(t => clearTimeout(t));
    this.noticeTimers.clear();
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
        this.loadContent(id, type);
      }
    }
  }

  private buildKey(type: string | undefined, id: number): string {
    let src = 'movies';
    if (type === 'tv-series') {
      src = 'tv-series';
    }
    else if (type === 'anime') {
      src = 'anime';
    }
    return `${src}:${id}`;
  }

  loadContent(contentId: number, typeFromRoute: string | null): void {
    window.scrollTo(0, 0);

    this.noticeTimers.forEach(t => clearTimeout(t));
    this.noticeTimers.clear();
    this.authNotices = [];
    this.pendingNotice = null;
    this.comments = [];
    this.commentText = '';

    let wantedType: 'movie' | 'tv-series' | 'anime' = 'movie';

    if (typeFromRoute === 'tv-series') {
      wantedType = 'tv-series';
    }
    else if (typeFromRoute === 'anime') {
      wantedType = 'anime';
    }

    const foundItem = this.allContentCache.find(
      m => m.id === contentId && m.type === wantedType
    );

    if (!foundItem) {
      console.error(`Контент ${wantedType} с ID ${contentId} не найден`);
      this.content = null;
      this.similarMovies = [];
      this.isLoadingSimilar = false;
      this.playerUrl = null;
      this.safePlayerUrl = null;
      return;
    }

    this.content = { ...foundItem };

    if (!this.content.directors?.trim()) {
      this.content.directors = 'Неизвестно';
    }
    if (!this.content.actors?.trim()) {
      this.content.actors = 'Неизвестно';
    }
    if (!this.content.countries?.trim()) {
      this.content.countries = 'Неизвестно';
    }
    if (!this.content.genres?.trim()) {
      this.content.genres = 'Неизвестно';
    }
    if (!this.content.year) {
      this.content.year = 0;
    }

    let apiSource = 'movies';
    if (wantedType === 'tv-series') {
      apiSource = 'tv-series';
    }
    else if (wantedType === 'anime') {
      apiSource = 'anime';
    }

    this.loadPlayer(contentId, apiSource);
    this.isLoadingSimilar = true;
    this.findSimilarMovies(this.content, this.allContentCache);

    this.isWatchingNow = false;
    this.isLater = false;
    this.isWatched = false;

    const user = this.auth.getUser();
    if (!user) {
      return;
    }

    const key = this.buildKey(this.content.type, this.content.id);

    this.contentService.getUserState().subscribe({
      next: (state) => {
        this.isWatchingNow = state.watching_now.includes(key);
        this.isLater = state.watch_later.includes(key);
        this.isWatched = state.watched.includes(key);
      },
      error: (err) => console.error('Не удалось получить состояние юзера:', err)
    });
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
    }
  }

  loadPlayer(contentId: number, source: string): void {
    this.isPlayerLoading = true;
    this.playerUrl = null;
    this.safePlayerUrl = null;
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
          this.isPlayerLoading = true;
        }
      },
      error: (err) => {
        console.error('Ошибка плеера:', err);
        this.playerUrl = null;
        this.safePlayerUrl = null;
        this.isPlayerLoading = true;
      }
    });
  }

  findSimilarMovies(currentMovie: Content, allContent: Content[]): void {
    if (!currentMovie.genres || currentMovie.genres === 'Неизвестно') {
      this.similarMovies = [];
      setTimeout(() => { this.isLoadingSimilar = false; }, 500);
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

    setTimeout(() => {
      this.similarMovies = shuffled.slice(0, 4).map(item => item.movie);
      this.isLoadingSimilar = false;
    }, 500);
  }

  toggleWatchingNow(): void {
    const user = this.auth.getUser();
    if (!user) {
      this.showAuthNotice('Смотрю сейчас', 'Войдите в аккаунт, чтобы добавить в список.');
      return;
    }
    if (!this.content) {
      return;
    }

    const key = this.buildKey(this.content.type, this.content.id);
    this.contentService.toggleWatchingNow(key).subscribe({
      next: (res) => this.isWatchingNow = res.active,
      error: (err) => console.error(err)
    });
  }

  toggleLater(): void {
    const user = this.auth.getUser();
    if (!user) {
      this.showAuthNotice('Смотреть позже', 'Войдите в аккаунт, чтобы отложить на вечер.');
      return;
    }
    if (!this.content) {
      return;
    }

    const key = this.buildKey(this.content.type, this.content.id);
    this.contentService.toggleWatchLater(key).subscribe({
      next: (res) => this.isLater = res.active,
      error: (err) => console.error(err)
    });
  }

  toggleWatched(event: Event): void {
    event.stopPropagation();

    const user = this.auth.getUser();
    if (!user) {
      this.showAuthNotice('Отметьте просмотренным', 'Войдите в аккаунт, чтобы отметить просмотренное.');
      return;
    }
    if (!this.content) {
      return;
    }

    const key = this.buildKey(this.content.type, this.content.id);
    this.contentService.toggleWatched(key).subscribe({
      next: (res) => this.isWatched = res.active,
      error: (err) => console.error(err)
    });
  }

  toggleSendComment(): void {
    if (!this.auth.getUser()) {
      this.showAuthNotice('Оставьте комментарий', 'Войдите в аккаунт, чтобы оставить комментарий.');
      return;
    }
  }

  closeAuthNotice(id: number): void {
    const timer = this.noticeTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.noticeTimers.delete(id);
    }

    const notice = this.authNotices.find(n => n.id === id);
    if (!notice || notice.leaving) {
      return;
    }

    notice.leaving = true;
    notice.visible = false;

    setTimeout(() => {
      this.authNotices = this.authNotices.filter(n => n.id !== id);

      if (this.pendingNotice && this.authNotices.length < this.NOTICE_LIMIT) {
        const pending = this.pendingNotice;
        this.pendingNotice = null;
        this.showAuthNotice(pending.title, pending.text);
      }
    }, this.NOTICE_LEAVE_DELAY);
  }

  private showAuthNotice(title: string, text: string): void {
    if (this.authNotices.length >= this.NOTICE_LIMIT) {
      this.pendingNotice = { title, text };
      const oldest = this.authNotices[this.authNotices.length - 1];
      if (!oldest.leaving) {
        this.closeAuthNotice(oldest.id);
      }
      return;
    }

    const id = ++this.noticeIdCounter;
    const notice: AuthNotice = { id, title, text, visible: false, leaving: false };

    this.authNotices.unshift(notice);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => { notice.visible = true; });
    });

    const timer = setTimeout(() => this.closeAuthNotice(id), this.NOTICE_LIFETIME);
    this.noticeTimers.set(id, timer);
  }

  onSelectContent(content: Content): void {
    let type = 'movie';
    if (content.type === 'tv-series') {
      type = 'tv-series';
    }
    else if (content.type === 'anime') {
      type = 'anime';
    }
    this.router.navigate(['/content', type, content.id]);
  }
}