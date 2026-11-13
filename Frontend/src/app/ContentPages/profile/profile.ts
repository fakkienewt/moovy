import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiceState } from '../../Services/service-state';
import { ServiceGetData } from '../../Services/service-get-data';
import { ServicePaginationState } from '../../Services/service-pagination-state';
import { ListItemModel } from '../../Models/ListItemModel';
import { CurrentUserModel } from '../../Models/CurrentUserModel';

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
  user: CurrentUserModel | null = null;
  active_tab: Tab = 'watch_later';
  current_list: ListItemModel[] = [];

  is_loading = true;
  modal_state: 'none' | 'logout' | 'delete' = 'none';
  is_settings_open = false;

  is_editing = false;
  edit_field: 'nickname' | 'username' | null = null;
  edit_draft = '';
  edit_error = '';
  is_saving = false;

  is_changing_password = false;
  old_password = '';
  new_password = '';
  password_error = '';
  is_saving_password = false;

  current_page = 1;
  items_per_page = 8;
  total_pages = 1;
  skeleton_items = Array.from({ length: 8 }, (_, i) => i);

  state: { watched: string[]; watching_now: string[]; watch_later: string[] } = {
    watched: [], watching_now: [], watch_later: []
  };

  all_content: any[] = [];
  full_list: ListItemModel[] = [];

  user_comments: any[] = [];
  paginated_comments: any[] = [];
  current_comments_page = 1;

  get Tabs(): { key: Tab; label: string; count: number }[] {
    return [
      { key: 'watch_later', label: 'Смотреть позже', count: this.state.watch_later.length },
      { key: 'watched', label: 'Просмотрено', count: this.state.watched.length },
      { key: 'watching_now', label: 'Смотрю сейчас', count: this.state.watching_now.length },
      { key: 'comments', label: 'Комментарии', count: this.user_comments.length }
    ];
  }

  constructor(
    private service_state: ServiceState,
    private service_get_data: ServiceGetData,
    private router: Router,
    private pagination_state_service: ServicePaginationState,
    private cdr: ChangeDetectorRef
  ) { }

  get ShelfTitle(): string {
    if (this.active_tab === 'watched') {
      return 'Просмотрено';
    }
    if (this.active_tab === 'watching_now') {
      return 'Смотрю сейчас';
    }
    if (this.active_tab === 'watch_later') {
      return 'Смотреть позже';
    }
    if (this.active_tab === 'comments') {
      return 'Комментарии';
    }
    return '';
  }

  get IsPaginationHidden(): boolean {
    return this.full_list.length <= this.items_per_page || this.is_loading;
  }

  get TotalCommentPages(): number {
    return Math.ceil(this.user_comments.length / this.items_per_page);
  }

  ngOnInit(): void {
    this.user = this.service_state.GetCurrentUserData();

    if (!this.user) {
      this.router.navigate(['/authorization']);
      return;
    }

    const VALID_TABS: Tab[] = ['watch_later', 'watched', 'watching_now', 'comments'];
    let saved_state = this.pagination_state_service.loadState();

    if (saved_state.activeTab && VALID_TABS.includes(saved_state.activeTab as Tab)) {
      this.active_tab = saved_state.activeTab as Tab;
    } else {
      this.active_tab = 'watch_later';
    }

    if (
      typeof saved_state.currentPage === 'number' &&
      Number.isInteger(saved_state.currentPage) &&
      saved_state.currentPage > 0
    ) {
      this.current_page = saved_state.currentPage;
    } else {
      this.current_page = 1;
    }

    if (
      typeof saved_state.commentsPage === 'number' &&
      Number.isInteger(saved_state.commentsPage) &&
      saved_state.commentsPage > 0
    ) {
      this.current_comments_page = saved_state.commentsPage;
    } else {
      this.current_comments_page = 1;
    }

    this.service_state.user$.subscribe(user => {
      this.user = user;
    });

    this.service_get_data.GetProfileData().subscribe({
      next: (data: any) => {
        this.all_content = data.content || [];
        this.state = data.state || { watching_now: [], watch_later: [], watched: [] };
        this.is_loading = false;
        this.RefreshList();

        if (this.user) {
          this.service_get_data.GetUserComments(this.user.id).subscribe(comments => {
            this.user_comments = comments.map(c => {
              return {
                ...c,
                movie_name: c.movie_name || 'Фильм удален',
                movie_year: c.movie_year || '',
                movie_poster: null
              };
            });
            this.RefreshComments();
          });
        }
      },
      error: (error: any) => {
        console.error(error);
        this.is_loading = false;
      }
    });
  }

  OpenSettings(): void {
    this.is_settings_open = true;
    this.CancelEdit();
    this.CancelPasswordChange();
  }

  CloseSettings(): void {
    this.is_settings_open = false;
    this.CancelEdit();
    this.CancelPasswordChange();
  }

  TriggerAvatarUpload(): void {
    let file_input = document.getElementById('avatar-upload') as HTMLInputElement;

    if (file_input) {
      file_input.click();
    }
  }

  OnAvatarSelected(event: Event): void {
    let input = event.target as HTMLInputElement;
    let file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    let reader = new FileReader();
    reader.onload = (e: any) => {
      let img = new Image();
      img.onload = () => {
        let canvas = document.createElement('canvas');
        let MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }

        canvas.width = width;
        canvas.height = height;
        let ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            return;
          }

          let compressed_file = new File([blob], file.name, { type: 'image/jpeg' });
          let preview_reader = new FileReader();

          preview_reader.onload = (preview_event: any) => {
            this.ApplyAvatar(preview_event.target.result, false);
            this.SyncAvatar(compressed_file);
          };

          preview_reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  private SyncAvatar(file: File): void {
    this.service_get_data.UploadAvatar(file).subscribe({
      next: (res: any) => {
        let url = (res.user as CurrentUserModel)?.avatar || res.avatar;
        if (!url) {
          this.CloseSettings();
          return;
        }

        this.ApplyAvatar(`${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`, true);
      },
      error: (error: any) => {
        console.error(error);
        this.CloseSettings();
      }
    });
  }

  private ApplyAvatar(avatar: string, close_settings = true): void {
    let base = this.service_state.GetCurrentUserData() || this.user;
    if (!base) {
      return;
    }

    let updated: CurrentUserModel = { ...base, avatar };
    this.service_state.UpdateUserData({ ...updated });
    this.user = { ...updated };
    this.cdr.detectChanges();

    if (close_settings) {
      this.CloseSettings();
    }
  }

  StartEdit(field: 'nickname' | 'username'): void {
    if (!this.user) {
      return;
    }

    this.CancelPasswordChange();
    this.edit_field = field;
    this.edit_draft = field === 'nickname' ? this.user.nickname : this.user.username;
    this.edit_error = '';
    this.is_editing = true;
  }

  CancelEdit(): void {
    this.is_editing = false;
    this.edit_field = null;
    this.edit_error = '';
    this.is_saving = false;
  }

  SaveEdit(): void {
    if (!this.user || !this.edit_field || this.is_saving) {
      return;
    }

    let value = (this.edit_draft || '').trim();

    if (this.edit_field === 'nickname') {
      if (value.length < 2 || value.length > 100) {
        this.edit_error = 'Ник должен быть от 2 до 100 символов';
        return;
      }
      if (value === this.user.nickname) {
        return this.CancelEdit();
      }
    } else {
      if (value.length < 3 || value.length > 50) {
        this.edit_error = 'Username должен быть от 3 до 50 символов';
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        this.edit_error = 'Только латиница, цифры и _';
        return;
      }
      if (value === this.user.username) {
        return this.CancelEdit();
      }
    }

    this.is_saving = true;
    this.edit_error = '';

    let request;

    if (this.edit_field === 'nickname') {
      request = this.service_get_data.UpdateNickname(value);
    } else {
      request = this.service_get_data.UpdateUsername(value);
    }

    request.subscribe({
      next: (res: any) => {
        this.service_state.UpdateUserData(res.user as CurrentUserModel);
        this.is_saving = false;
        this.is_editing = false;
        this.edit_field = null;
      },
      error: (error: any) => {
        this.is_saving = false;
        this.edit_error = error?.error?.error || 'Не удалось сохранить';
      }
    });
  }

  StartPasswordChange(): void {
    this.CancelEdit();
    this.is_changing_password = true;
    this.old_password = '';
    this.new_password = '';
    this.password_error = '';
  }

  CancelPasswordChange(): void {
    this.is_changing_password = false;
    this.old_password = '';
    this.new_password = '';
    this.password_error = '';
    this.is_saving_password = false;
  }

  SavePassword(): void {
    if (!this.old_password || !this.new_password || this.is_saving_password) {
      return;
    }

    if (this.new_password.length < 8) {
      this.password_error = 'Новый пароль должен быть минимум 8 символов';
      return;
    }

    this.is_saving_password = true;
    this.password_error = '';

    this.service_get_data.UpdatePassword({ old_password: this.old_password, new_password: this.new_password }).subscribe({
      next: () => {
        this.CloseSettings();
      },
      error: (error: any) => {
        this.is_saving_password = false;
        this.password_error = error?.error?.error || 'Не удалось изменить пароль';
      }
    });
  }

  SetTab(tab: Tab): void {
    this.active_tab = tab;
    this.current_page = 1;
    this.current_comments_page = 1;

    this.full_list = [];
    this.SavePaginationState();

    if (tab !== 'comments') {
      this.RefreshList();
    } else {
      this.RefreshComments();
    }
  }
  NextPage(): void {
    if (this.current_page < this.total_pages) {
      this.current_page++;
      this.UpdatePagination();
      this.SavePaginationState();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  BackPage(): void {
    if (this.current_page > 1) {
      this.current_page--;
      this.UpdatePagination();
      this.SavePaginationState();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  NextCommentPage(): void {
    if (this.current_comments_page < this.TotalCommentPages) {
      this.current_comments_page++;
      this.RefreshComments();
      this.SavePaginationState();
    }
  }

  PrevCommentPage(): void {
    if (this.current_comments_page > 1) {
      this.current_comments_page--;
      this.RefreshComments();
      this.SavePaginationState();
    }
  }

  OnOpenItem(item: ListItemModel): void {
    this.SavePaginationState();
    this.router.navigate(['/content', item.type, item.id]);
  }

  OnOpenContentByKey(key: string): void {
    this.SavePaginationState();
    let [type_key, id_str] = key.split(':');
    let type = type_key === 'movies' ? 'movie' : type_key;
    this.router.navigate(['/content', type, id_str]);
  }

  OpenModal(state: 'logout' | 'delete'): void {
    this.modal_state = state;
    this.CloseSettings();
  }

  CloseModal(): void {
    this.modal_state = 'none';
  }

  ConfirmAction(): void {
    if (this.modal_state === 'logout') {
      this.service_state.LogoutFromAccount();
      this.router.navigate(['/']);
    } else if (this.modal_state === 'delete') {
      this.service_get_data.DeleteAccount().subscribe({
        next: () => {
          this.service_state.LogoutFromAccount();
          this.router.navigate(['/']);
        },
        error: (error: any) => console.error(error)
      });
    }
    this.CloseModal();
  }

  private SavePaginationState(): void {
    this.pagination_state_service.saveState({
      activeTab: this.active_tab,
      currentPage: this.current_page,
      commentsPage: this.current_comments_page
    });
  }

  private RefreshList(): void {
    if (this.active_tab === 'comments') {
      return;
    }

    let list_tab = this.active_tab as ListTab;
    let keys = this.state[list_tab] || [];

    this.full_list = keys
      .map((key: string) => {
        let [type_key, id_str] = key.split(':');
        let item_id = +id_str;
        let content_type = type_key === 'movies' ? 'movie' : type_key;
        let found = this.all_content.find(c => c.id === item_id && c.type === content_type);

        if (!found) {
          return null;
        }

        return {
          key: key,
          id: found.id,
          name: found.name,
          year: found.year,
          poster: found.poster,
          type: found.type,
          rating: found.rating
        } as ListItemModel;
      })
      .filter((item): item is ListItemModel => item !== null)
      .reverse();

    this.total_pages = Math.max(1, Math.ceil(this.full_list.length / this.items_per_page));
    if (this.current_page > this.total_pages) {
      this.current_page = this.total_pages;
    }
    this.UpdatePagination();
  }

  private RefreshComments(): void {
    let start = (this.current_comments_page - 1) * this.items_per_page;
    this.paginated_comments = this.user_comments.slice(start, start + this.items_per_page);
  }

  private UpdatePagination(): void {
    let start_index = (this.current_page - 1) * this.items_per_page;
    this.current_list = this.full_list.slice(start_index, start_index + this.items_per_page);
  }

  DeleteComment(comment_id: string, content_key: string): void {
    this.service_get_data.DeleteComment(content_key, comment_id).subscribe({
      next: () => {
        this.user_comments = this.user_comments.filter(c => c.id !== comment_id);

        if (this.paginated_comments.length === 1 && this.current_comments_page > 1) {
          this.current_comments_page--;
        }

        this.RefreshComments();
      },
      error: (err) => console.error(err)
    });
  }
}