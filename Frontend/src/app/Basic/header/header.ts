import { Router, NavigationStart } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Subject, Subscription, catchError, debounceTime, distinctUntilChanged, map, of, switchMap
} from 'rxjs';
import { ServiceGetData } from '../../Services/service-get-data';
import { ContentModel } from '../../Models/ContentModel';
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ServiceState } from '../../Services/service-state';
import { CurrentUserModel } from '../../Models/CurrentUserModel';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit, OnDestroy {
  search_query: string = '';
  search_results: ContentModel[] = [];
  current_user: CurrentUserModel | null = null;

  private search_subject = new Subject<string>();
  private router_subscription!: Subscription;
  private search_subscription!: Subscription;

  constructor(
    private router: Router,
    private service_get_data: ServiceGetData,
    private service_state: ServiceState
  ) { }

  PrepareTextForSearch(text: string | null | undefined): string {
    if (!text) {
      return '';
    }

    let lower_case_text = text.toLowerCase();
    let text_without_yo = lower_case_text.replace(/ё/g, 'е');
    return text_without_yo;
  }

  CheckTextMatch(source_text: string | null | undefined, search_query: string | null | undefined): boolean {
    let prepared_query = this.PrepareTextForSearch(search_query).trim();

    if (!prepared_query) {
      return true;
    }

    let prepared_source = this.PrepareTextForSearch(source_text);
    return prepared_source.includes(prepared_query);
  }

  ngOnInit(): void {
    this.service_state.user$.subscribe(user => {
      this.current_user = user;
    });

    this.search_subscription = this.search_subject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(search_text => {
        let prepared_query = this.PrepareTextForSearch(search_text).trim();

        if (prepared_query.length < 2) {
          return of([]);
        }

        return this.service_get_data.SearchContent(search_text).pipe(
          map(response => {
            let found_items = response.items || [];
            return found_items.filter(item => this.CheckTextMatch(item.name, search_text));
          }),
          catchError(error => {
            console.error('Ошибка поиска:', error);
            return of([]);
          })
        );
      })
    ).subscribe(found_results => {
      this.search_results = found_results;
    });

    this.router_subscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.ClearSearch();
      }
    });
  }

  ngOnDestroy(): void {
    this.router_subscription?.unsubscribe();
    this.search_subscription?.unsubscribe();
  }

  OnProfileClick(): void {
    if (this.current_user) {
      this.router.navigate(['/profile']);
      return;
    }
    this.router.navigate(['/authorization']);
  }

  OnLogoClick(): void {
    this.router.navigate(['/']);
  }

  OnSearchInput(input_value: string): void {
    this.search_query = input_value;
    let query = input_value.trim();

    if (query.length < 2) {
      this.search_results = [];
    }

    this.search_subject.next(query);
  }

  SelectSearchResult(item: ContentModel): void {
    let content_type = item.type || 'movie';
    this.router.navigate(['/content', content_type, item.id]);
    this.ClearSearch();
  }

  @HostListener('document:click', ['$event.target'])
  OnClickOutside(target_element: EventTarget | null): void {
    let input_group = document.querySelector('.basic-header-section-search');

    if (target_element instanceof HTMLElement && input_group) {
      if (!input_group.contains(target_element)) {
        this.ClearSearch();
      }
    }
  }

  HandlePosterError(event: Event): void {
    let image = event.target as HTMLImageElement;
    image.style.display = 'none';

    if (image.parentElement) {
      image.parentElement.style.background = 'linear-gradient(135deg, #b3e0ff 0%, #87CEEB 100%)';
    }
  }

  private ClearSearch(): void {
    this.search_query = '';
    this.search_results = [];
    this.search_subject.next('');
  }
}