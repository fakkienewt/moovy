import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthStateService, CurrentUser } from '../../Services/auth-state-service';
import { ServiceGetData } from '../../Services/service-get-data';
import { PaginationStateService } from '../../Services/pagination-state-service';

interface ListItem {
  key: string;
  name: string;
  year?: number;
  poster?: string;
  type: string;
  id: number;
  rating?: number | string;
}

interface UserComment {
  id: number;
  author: string;
  text: string;
  date: string;
}

type Tab = 'watched' | 'favorites' | 'watch_later' | 'comments';
type ListTab = 'watched' | 'favorites' | 'watch_later';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  user: CurrentUser | null = null;
  registeredAt = '';
  activeTab: Tab = 'watched';
  currentList: ListItem[] = [];
  userComments: UserComment[] = [];

  isLoading = true;

  currentPage = 1;
  itemsPerPage = 8;
  totalPages = 1;
  skeletonItems = Array.from({ length: 8 }, (_, i) => i);

  state: { watched: string[]; favorites: string[]; watch_later: string[] } = {
    watched: [], favorites: [], watch_later: []
  };

  allContent: any[] = [];
  fullList: ListItem[] = [];

  constructor(
    private auth: AuthStateService,
    private api: ServiceGetData,
    private router: Router,
    private stateService: PaginationStateService
  ) { }

  get shelfTitle(): string {
    switch (this.activeTab) {
      case 'watched': return 'Просмотрено';
      case 'favorites': return 'Смотрю';
      case 'watch_later': return 'Смотреть позже';
      default: return '';
    }
  }

  get isPaginationHidden(): boolean {
    const length = this.activeTab === 'comments' ? this.userComments.length : this.fullList.length;
    return length <= this.itemsPerPage || this.isLoading;
  }

  ngOnInit(): void {
    this.user = this.auth.getUser();
    if (!this.user) {
      this.router.navigate(['/auth']);
      return;
    }

    const raw = localStorage.getItem('moovy_user');
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj.created_at) {
        this.registeredAt = new Date(obj.created_at).toLocaleDateString('ru-RU');
      } else {
        this.registeredAt = new Date().toLocaleDateString('ru-RU');
      }
    }

    const saved = this.stateService.load();
    if (saved.currentPage && saved.currentPage > 0) {
      this.currentPage = saved.currentPage;
    }

    this.api.getProfileData(this.user.id).subscribe({
      next: (data) => {
        this.allContent = data.content || [];
        this.state = data.state || { favorites: [], watch_later: [], watched: [] };
        this.isLoading = false;
        this.refreshList();
      },
      error: (e) => {
        console.error(e);
        this.isLoading = false;
      }
    });
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    this.currentPage = 1;
    if (tab !== 'comments') {
      this.refreshList();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
      this.persist();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  backPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
      this.persist();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onOpenItem(item: ListItem): void {
    this.router.navigate(['/content', item.type, item.id]);
  }

  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  onDeleteAccount(): void {
    if (!confirm('Точно удалить аккаунт? Это действие необратимо.')) {
      return;
    }
    if (!this.user) {
      return;
    }

    this.api.deleteAccount(this.user.id).subscribe({
      next: () => {
        this.auth.logout();
        this.router.navigate(['/']);
      },
      error: (e) => console.error(e)
    });
  }

  private persist(): void {
    this.stateService.save({
      activeTab: this.activeTab,
      currentPage: this.currentPage
    });
  }

  private refreshList(): void {
    if (this.activeTab === 'comments') {
      return;
    }

    const tab = this.activeTab as ListTab;
    const keys = this.state[tab] || [];

    this.fullList = keys
      .map((key: string) => {
        const [typeKey, idStr] = key.split(':');
        const id = +idStr;
        const type = typeKey === 'movies' ? 'movie' : typeKey;
        const found = this.allContent.find(c => c.id === id && c.type === type);
        if (!found) {
          return null;
        }
        return {
          key,
          id: found.id,
          name: found.name,
          year: found.year,
          poster: found.poster,
          type: found.type,
          rating: found.rating
        } as ListItem;
      })
      .filter((x: ListItem | null): x is ListItem => x !== null);

    this.totalPages = Math.max(1, Math.ceil(this.fullList.length / this.itemsPerPage));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.updatePagination();
  }

  private updatePagination(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.currentList = this.fullList.slice(start, start + this.itemsPerPage);
  }
}