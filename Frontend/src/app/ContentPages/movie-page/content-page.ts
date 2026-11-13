import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ServiceGetData } from '../../Services/service-get-data';
import { ContentModel } from '../../Models/ContentModel';
import { FormsModule } from '@angular/forms';
import { ServiceState } from '../../Services/service-state';
import { NoticeModel } from '../../Models/NoticeModel';
import { CommentModel } from '../../Models/CommentModel';

@Component({
  selector: 'app-content-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './content-page.html',
  styleUrl: './content-page.scss'
})
export class ContentPage implements OnInit, OnDestroy {
  content: ContentModel | null = null;
  similar_movies: ContentModel[] = [];
  is_loading_similar = true;
  skeleton_similar_items = Array.from({ length: 4 }, (_, i) => i);

  is_watching_now = false;
  is_later = false;
  is_watched = false;

  notices: NoticeModel[] = [];

  player_url: string | null = null;
  safe_player_url: SafeResourceUrl | null = null;
  is_player_loading = true;

  private navigation_subscription!: Subscription;
  private notice_timers = new Map<number, any>();
  private notice_id_counter = 0;
  private cache_loaded = false;
  private all_content_cache: ContentModel[] = [];

  private pending_notice: { title: string; text: string } | null = null;

  comments: CommentModel[] = [];
  comment_text = '';
  comment_page = 1;
  comments_per_page = 10;
  editing_comment_id: string | null = null;
  edit_comment_text = '';
  current_user_id: number | null = null;
  delete_comment_id: string | null = null;

  private readonly NOTICE_LIMIT = 5;
  private readonly NOTICE_LIFETIME = 10000;
  private readonly NOTICE_LEAVE_DELAY = 280;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service_get_data: ServiceGetData,
    private sanitizer: DomSanitizer,
    private service_state: ServiceState
  ) { }

  OnPlayerLoad(): void {
    let iframe = document.querySelector('.content-player-iframe');
    if (iframe) {
      iframe.classList.add('loaded');
    }
    setTimeout(() => {
      this.is_player_loading = false;
    }, 400);
  }

  ngOnInit(): void {
    this.navigation_subscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.HandleRoute();
    });

    forkJoin({
      movies: this.service_get_data.GetMovies(),
      series: this.service_get_data.GetTVSeries(),
      anime: this.service_get_data.GetAnime()
    }).subscribe({
      next: (data: any) => {
        this.all_content_cache = [
          ...(data.movies || []),
          ...(data.series || []),
          ...(data.anime || [])
        ];
        this.cache_loaded = true;
        this.HandleRoute();
      },
      error: (error: any) => console.error('Ошибка загрузки кэша:', error)
    });
  }

  ngOnDestroy(): void {
    if (this.navigation_subscription) {
      this.navigation_subscription.unsubscribe();
    }
    this.notice_timers.forEach(timer => clearTimeout(timer));
    this.notice_timers.clear();
  }

  private HandleRoute(): void {
    if (!this.cache_loaded) {
      return;
    }

    let url_parts = this.router.url.split('/');
    if (url_parts[1] === 'content' && url_parts[3]) {
      let type = url_parts[2];
      let content_id = +url_parts[3];

      if (!isNaN(content_id)) {
        this.LoadContent(content_id, type);
      }
    }
  }

  private BuildKey(type: string | undefined, id: number): string {
    let source = 'movies';
    if (type === 'tv-series') {
      source = 'tv-series';
    } else if (type === 'anime') {
      source = 'anime';
    }
    return `${source}:${id}`;
  }

  LoadContent(content_id: number, type_from_route: string | null): void {
    window.scrollTo(0, 0);

    this.notice_timers.forEach(timer => clearTimeout(timer));
    this.notice_timers.clear();
    this.notices = [];
    this.pending_notice = null;

    let wanted_type: 'movie' | 'tv-series' | 'anime' = 'movie';

    if (type_from_route === 'tv-series') {
      wanted_type = 'tv-series';
    } else if (type_from_route === 'anime') {
      wanted_type = 'anime';
    }

    let found_item = this.all_content_cache.find(
      item => item.id === content_id && item.type === wanted_type
    );

    if (!found_item) {
      console.error(`Контент ${wanted_type} с ID ${content_id} не найден`);
      this.content = null;
      this.similar_movies = [];
      this.is_loading_similar = false;
      this.player_url = null;
      this.safe_player_url = null;
      return;
    }

    this.content = { ...found_item };

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

    let api_source = 'movies';
    if (wanted_type === 'tv-series') {
      api_source = 'tv-series';
    } else if (wanted_type === 'anime') {
      api_source = 'anime';
    }

    this.LoadPlayer(content_id, api_source);
    this.is_loading_similar = true;
    this.FindSimilarMovies(this.content, this.all_content_cache);

    this.is_watching_now = false;
    this.is_later = false;
    this.is_watched = false;

    let user = this.service_state.GetCurrentUserData();
    let item_key = this.BuildKey(this.content.type, this.content.id);

    this.LoadComments(item_key);
    this.comment_text = '';
    this.editing_comment_id = null;
    this.delete_comment_id = null;
    this.current_user_id = user ? user.id : null;

    if (!user) {
      return;
    }

    this.service_get_data.GetUserMovieLists().subscribe({
      next: (state: any) => {
        this.is_watching_now = state.watching_now.includes(item_key);
        this.is_later = state.watch_later.includes(item_key);
        this.is_watched = state.watched.includes(item_key);
      },
      error: (error: any) => console.error('Не удалось получить состояние юзера:', error)
    });
  }

  HandleImageError(event: Event): void {
    let image = event.target as HTMLImageElement;
    if (image) {
      image.style.display = 'none';
    }
  }

  LoadPlayer(content_id: number, source: string): void {
    this.is_player_loading = true;
    this.player_url = null;
    this.safe_player_url = null;

    this.service_get_data.GetPlayerLink(content_id, source).subscribe({
      next: (response: any) => {
        let url = response?.primary_player ||
          (response?.players && response.players.length > 0 ? response.players[0] : null);
        if (url) {
          this.player_url = url;
          this.safe_player_url = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        } else {
          this.player_url = null;
          this.safe_player_url = null;
          this.is_player_loading = true;
        }
      },
      error: (error: any) => {
        console.error('Ошибка плеера:', error);
        this.player_url = null;
        this.safe_player_url = null;
        this.is_player_loading = true;
      }
    });
  }

  FindSimilarMovies(current_movie: ContentModel, all_content: ContentModel[]): void {
    if (!current_movie.genres || current_movie.genres === 'Неизвестно') {
      this.similar_movies = [];
      setTimeout(() => { this.is_loading_similar = false; }, 500);
      return;
    }

    let current_genres = current_movie.genres.toLowerCase().split(',').map(genre => genre.trim());
    let current_type = current_movie.type;

    let scored_movies = all_content
      .filter(item =>
        item.id !== current_movie.id &&
        item.type === current_type &&
        item.genres &&
        item.genres !== 'Неизвестно'
      )
      .map(movie => {
        let movie_genres = movie.genres!.toLowerCase().split(',').map(genre => genre.trim());
        let match_count = movie_genres.filter(genre => current_genres.includes(genre)).length;
        return { movie: movie, score: match_count };
      })
      .filter(item => item.score > 0);

    scored_movies.sort((a, b) => b.score - a.score);

    setTimeout(() => {
      this.similar_movies = scored_movies.slice(0, 4).map(item => item.movie);
      this.is_loading_similar = false;
    }, 500);
  }

  SwitchWatchingNow(): void {
    let user = this.service_state.GetCurrentUserData();
    if (!user) {
      this.ShowNotice('Смотрю сейчас', 'Войдите в аккаунт, чтобы добавить в список.');
      return;
    }
    if (!this.content) {
      return;
    }

    let item_key = this.BuildKey(this.content.type, this.content.id);
    this.service_get_data.SwitchWatchingNow(item_key).subscribe({
      next: (response: any) => {
        this.is_watching_now = response.active;
        if (response.active) {
          this.is_later = false;
          this.is_watched = false;
        }
      },
      error: (error: any) => console.error(error)
    });
  }

  SwitchLater(): void {
    let user = this.service_state.GetCurrentUserData();
    if (!user) {
      this.ShowNotice('Смотреть позже', 'Войдите в аккаунт, чтобы отложить на вечер.');
      return;
    }
    if (!this.content) {
      return;
    }

    let item_key = this.BuildKey(this.content.type, this.content.id);
    this.service_get_data.SwitchWatchLater(item_key).subscribe({
      next: (response: any) => {
        this.is_later = response.active;
        if (response.active) {
          this.is_watching_now = false;
          this.is_watched = false;
        }
      },
      error: (error: any) => console.error(error)
    });
  }

  SwitchWatched(event: Event): void {
    event.stopPropagation();

    let user = this.service_state.GetCurrentUserData();
    if (!user) {
      this.ShowNotice('Отметьте просмотренным', 'Войдите в аккаунт, чтобы отметить просмотренное.');
      return;
    }
    if (!this.content) {
      return;
    }

    let item_key = this.BuildKey(this.content.type, this.content.id);
    this.service_get_data.SwitchWatched(item_key).subscribe({
      next: (response: any) => {
        this.is_watched = response.active;
        if (response.active) {
          this.is_later = false;
          this.is_watching_now = false;
        }
      },
      error: (error: any) => console.error(error)
    });
  }

  CloseNotice(notice_id: number): void {
    let timer = this.notice_timers.get(notice_id);
    if (timer) {
      clearTimeout(timer);
      this.notice_timers.delete(notice_id);
    }

    let notice = this.notices.find(n => n.id === notice_id);
    if (!notice || notice.leaving) {
      return;
    }

    notice.leaving = true;
    notice.visible = false;

    setTimeout(() => {
      this.notices = this.notices.filter(n => n.id !== notice_id);

      if (this.pending_notice && this.notices.length < this.NOTICE_LIMIT) {
        let pending = this.pending_notice;
        this.pending_notice = null;
        this.ShowNotice(pending.title, pending.text);
      }
    }, this.NOTICE_LEAVE_DELAY);
  }

  private ShowNotice(title: string, text: string): void {
    if (this.notices.length >= this.NOTICE_LIMIT) {
      this.pending_notice = { title, text };
      let oldest = this.notices[this.notices.length - 1];
      if (!oldest.leaving) {
        this.CloseNotice(oldest.id);
      }
      return;
    }

    let notice_id = ++this.notice_id_counter;
    let notice: NoticeModel = { id: notice_id, title, text, visible: false, leaving: false };

    this.notices.unshift(notice);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => { notice.visible = true; });
    });

    let timer = setTimeout(() => this.CloseNotice(notice_id), this.NOTICE_LIFETIME);
    this.notice_timers.set(notice_id, timer);
  }

  OnSelectContent(content: ContentModel): void {
    let content_type = 'movie';
    if (content.type === 'tv-series') {
      content_type = 'tv-series';
    } else if (content.type === 'anime') {
      content_type = 'anime';
    }
    this.router.navigate(['/content', content_type, content.id]);
  }

  get PaginatedComments(): CommentModel[] {
    let start = (this.comment_page - 1) * this.comments_per_page;
    return this.comments.slice(start, start + this.comments_per_page);
  }

  get TotalCommentPages(): number {
    return Math.ceil(this.comments.length / this.comments_per_page);
  }

  LoadComments(content_key: string): void {
    this.service_get_data.GetComments(content_key).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.comment_page = 1;
      },
      error: (err) => console.error(err)
    });
  }

  SendComment(): void {
    let user = this.service_state.GetCurrentUserData();
    if (!user) {
      this.ShowNotice('Ошибка', 'Войдите в аккаунт, чтобы оставить комментарий.');
      return;
    }

    let text = this.comment_text.trim();
    if (!text) {
      return;
    }

    let content_key = this.BuildKey(this.content?.type, this.content?.id || 0);

    this.service_get_data.AddComment(content_key, text).subscribe({
      next: (new_comment) => {
        this.comments.unshift(new_comment);
        this.comment_text = '';
        this.comment_page = 1;
      },
      error: (err) => console.error(err)
    });
  }

  DeleteComment(comment_id: string): void {
    this.delete_comment_id = comment_id;
  }

  CancelDeleteComment(): void {
    this.delete_comment_id = null;
  }

  ConfirmDeleteComment(): void {
    if (!this.delete_comment_id) {
      return;
    }

    let content_key = this.BuildKey(this.content?.type, this.content?.id || 0);
    this.service_get_data.DeleteComment(content_key, this.delete_comment_id).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== this.delete_comment_id);
        this.delete_comment_id = null;
      },
      error: (err) => console.error(err)
    });
  }

  StartEditComment(comment: CommentModel): void {
    this.editing_comment_id = comment.id;
    this.edit_comment_text = comment.text;
  }

  CancelEditComment(): void {
    this.editing_comment_id = null;
    this.edit_comment_text = '';
  }

  SaveEditComment(comment_id: string): void {
    let text = this.edit_comment_text.trim();

    if (!text) {
      return;
    }

    let content_key = this.BuildKey(this.content?.type, this.content?.id || 0);
    this.service_get_data.UpdateComment(content_key, comment_id, text).subscribe({
      next: (res) => {
        let comment = this.comments.find(c => c.id === comment_id);
        if (comment) comment.text = res.text;
        this.editing_comment_id = null;
      },
      error: (err) => console.error(err)
    });
  }

  NextCommentPage(): void {
    if (this.comment_page < this.TotalCommentPages) {
      this.comment_page++;
    }
  }

  PrevCommentPage(): void {
    if (this.comment_page > 1) {
      this.comment_page--;
    }
  }

  VoteComment(comment: CommentModel, type: 'like' | 'dislike'): void {
    let user = this.service_state.GetCurrentUserData();
    if (!user) {
      this.ShowNotice('Ошибка', 'Войдите в аккаунт, чтобы оценивать комментарии.');
      return;
    }

    let content_key = this.BuildKey(this.content?.type, this.content?.id || 0);

    this.service_get_data.VoteComment(content_key, comment.id, type).subscribe({
      next: (res) => {
        comment.likes_count = res.likes_count;
        comment.dislikes_count = res.dislikes_count;

        if (res.user_vote === 'like') {
          if (!comment.likes.includes(user.id)) comment.likes.push(user.id);
          comment.dislikes = comment.dislikes.filter(id => id !== user.id);
        } else if (res.user_vote === 'dislike') {
          if (!comment.dislikes.includes(user.id)) comment.dislikes.push(user.id);
          comment.likes = comment.likes.filter(id => id !== user.id);
        } else {
          comment.likes = comment.likes.filter(id => id !== user.id);
          comment.dislikes = comment.dislikes.filter(id => id !== user.id);
        }
      },
      error: (err) => console.error(err)
    });
  }
}