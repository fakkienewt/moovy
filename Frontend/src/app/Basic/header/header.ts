import { Router, NavigationStart } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Subject, Subscription, catchError, debounceTime, distinctUntilChanged, map, of, switchMap
} from 'rxjs';
import { ServiceGetData } from '../../Services/service-get-data';
import { Content } from '../../Models/ContentModel';
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { AuthStateService, CurrentUser } from '../../Services/auth-state-service';

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

  currentUser: CurrentUser | null = null;

  private searchSubject = new Subject<string>();
  private routerSub!: Subscription;
  private searchSub!: Subscription;

  constructor(
    private router: Router,
    private contentService: ServiceGetData,
    private auth: AuthStateService
  ) { }

  onProfileClick(): void {
    if (this.currentUser) {
      this.router.navigate(['/profile']);
      return;
    }
    this.router.navigate(['/auth']);
  }

  ngOnInit(): void {
    this.auth.user$.subscribe(u => this.currentUser = u);

    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 2) {
          return of([] as Content[]);
        }

        return this.contentService.searchContent(query).pipe(
          map(response => response.items || []),
          catchError((err) => {
            console.error('Ошибка поиска:', err);
            return of([] as Content[]);
          })
        );
      })
    ).subscribe(results => this.searchResults = results);

    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.clearSearch();
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.searchSub?.unsubscribe();
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
    const query = val.trim();

    if (query.length < 2) {
      this.searchResults = [];
    }

    this.searchSubject.next(query);
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
    this.searchSubject.next('');
  }

  handlePosterError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';

    if (img.parentElement) {
      img.parentElement.style.background = 'linear-gradient(135deg, #b3e0ff 0%, #87CEEB 100%)';
    }
  }
}
