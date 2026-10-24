import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

type Tab = 'watched' | 'watching_now' | 'watch_later' | 'comments';
type ListTab = 'watched' | 'watching_now' | 'watch_later';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  user: CurrentUser | null = null;
  activeTab: Tab = 'watch_later';
  currentList: ListItem[] = [];
  userComments: UserComment[] = [];

  isLoading = true;
  modalState: 'none' | 'logout' | 'delete' = 'none';
  isSettingsOpen = false;

  isEditing = false;
  editField: 'nickname' | 'username' | null = null;
  editDraft = '';
  editError = '';
  isSaving = false;

  isChangingPassword = false;
  oldPassword = '';
  newPassword = '';
  passwordError = '';
  isSavingPassword = false;

  currentPage = 1;
  itemsPerPage = 8;
  totalPages = 1;
  skeletonItems = Array.from({ length: 8 }, (_, i) => i);

  state: { watched: string[]; watching_now: string[]; watch_later: string[] } = {
    watched: [], watching_now: [], watch_later: []
  };

  allContent: any[] = [];
  fullList: ListItem[] = [];

  get tabs(): { key: Tab; label: string; count: number }[] {
    return [
      { key: 'watch_later', label: 'Смотреть позже', count: this.state.watch_later.length },
      { key: 'watched', label: 'Просмотрено', count: this.state.watched.length },
      { key: 'watching_now', label: 'Смотрю сейчас', count: this.state.watching_now.length },
      { key: 'comments', label: 'Комментарии', count: this.userComments.length },
    ];
  }

  constructor(
    private auth: AuthStateService,
    private api: ServiceGetData,
    private router: Router,
    private stateService: PaginationStateService,
    private cdr: ChangeDetectorRef
  ) { }

  get shelfTitle(): string {
    switch (this.activeTab) {
      case 'watched': return 'Просмотрено';
      case 'watching_now': return 'Смотрю сейчас';
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

    this.activeTab = 'watch_later';

    const saved = this.stateService.load();
    if (saved.currentPage && saved.currentPage > 0 && saved.activeTab === 'watch_later') {
      this.currentPage = saved.currentPage;
    } else {
      this.currentPage = 1;
    }

    this.auth.user$.subscribe(u => {
      this.user = u;
    });

    this.api.getProfileData().subscribe({
      next: (data) => {
        this.allContent = data.content || [];
        this.state = data.state || { watching_now: [], watch_later: [], watched: [] };
        this.isLoading = false;
        this.refreshList();
      },
      error: (e) => {
        console.error(e);
        this.isLoading = false;
      }
    });
  }

  openSettings(): void {
    this.isSettingsOpen = true;
    this.cancelEdit();
    this.cancelPasswordChange();
  }

  closeSettings(): void {
    this.isSettingsOpen = false;
    this.cancelEdit();
    this.cancelPasswordChange();
  }

  triggerAvatarUpload(): void {
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            return;
          }

          const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
          const previewReader = new FileReader();

          previewReader.onload = (previewEvent: any) => {
            this.applyAvatar(previewEvent.target.result, false);
            this.syncAvatar(compressedFile);
          };

          previewReader.readAsDataURL(blob);
        }, 'image/jpeg', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  private syncAvatar(file: File): void {
    this.api.uploadAvatar(file).subscribe({
      next: (res) => {
        const url = (res.user as CurrentUser)?.avatar || res.avatar;
        if (!url) {
          this.closeSettings();
          return;
        }

        this.applyAvatar(`${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`, true);
      },
      error: (err) => {
        console.error(err);
        this.closeSettings();
      }
    });
  }

  private applyAvatar(avatar: string, closeSettings = true): void {
    const base = this.auth.getUser() || this.user;
    if (!base) {
      return;
    }

    const updated: CurrentUser = { ...base, avatar };
    this.auth.setUser({ ...updated });
    this.user = { ...updated };
    this.cdr.detectChanges();

    if (closeSettings) {
      this.closeSettings();
    }
  }

  startEdit(field: 'nickname' | 'username'): void {

    if (!this.user) {
      return;
    }

    this.cancelPasswordChange();
    this.editField = field;
    this.editDraft = field === 'nickname' ? this.user.nickname : this.user.username;
    this.editError = '';
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editField = null;
    this.editError = '';
    this.isSaving = false;
  }

  saveEdit(): void {
    if (!this.user || !this.editField || this.isSaving) {
      return;
    }

    const value = (this.editDraft || '').trim();

    if (this.editField === 'nickname') {
      if (value.length < 2 || value.length > 100) {
        this.editError = 'Ник должен быть от 2 до 100 символов';
        return;
      }
      if (value === this.user.nickname) return this.cancelEdit();
    } else {
      if (value.length < 3 || value.length > 50) {
        this.editError = 'Username должен быть от 3 до 50 символов';
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        this.editError = 'Только латиница, цифры и _';
        return;
      }
      if (value === this.user.username) {
        return this.cancelEdit();
      }
    }

    this.isSaving = true;
    this.editError = '';

    const req$ = this.editField === 'nickname'
      ? this.api.updateNickname(value)
      : this.api.updateUsername(value);

    req$.subscribe({
      next: (res) => {
        this.auth.setUser(res.user as CurrentUser);
        this.isSaving = false;
        this.isEditing = false;
        this.editField = null;
      },
      error: (e) => {
        this.isSaving = false;
        this.editError = e?.error?.error || 'Не удалось сохранить';
      }
    });
  }

  startPasswordChange(): void {
    this.cancelEdit();
    this.isChangingPassword = true;
    this.oldPassword = '';
    this.newPassword = '';
    this.passwordError = '';
  }

  cancelPasswordChange(): void {
    this.isChangingPassword = false;
    this.oldPassword = '';
    this.newPassword = '';
    this.passwordError = '';
    this.isSavingPassword = false;
  }

  savePassword(): void {
    if (!this.oldPassword || !this.newPassword || this.isSavingPassword) {
      return;
    }

    if (this.newPassword.length < 8) {
      this.passwordError = 'Новый пароль должен быть минимум 8 символов';
      return;
    }

    this.isSavingPassword = true;
    this.passwordError = '';

    this.api.updatePassword({ old_password: this.oldPassword, new_password: this.newPassword }).subscribe({
      next: () => {
        this.closeSettings();
      },
      error: (e) => {
        this.isSavingPassword = false;
        this.passwordError = e?.error?.error || 'Не удалось изменить пароль';
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

  openModal(state: 'logout' | 'delete'): void {
    this.modalState = state;
    this.closeSettings();
  }

  closeModal(): void {
    this.modalState = 'none';
  }

  confirmAction(): void {
    if (this.modalState === 'logout') {
      this.auth.logout();
      this.router.navigate(['/']);
    } else if (this.modalState === 'delete') {
      this.api.deleteAccount().subscribe({
        next: () => {
          this.auth.logout();
          this.router.navigate(['/']);
        },
        error: (e) => console.error(e)
      });
    }
    this.closeModal();
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
      .filter((x: ListItem | null): x is ListItem => x !== null)
      .reverse();

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