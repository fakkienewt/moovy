import { Injectable } from '@angular/core';
import { MainPageStateModel } from '../Models/MainPageStateModel';

@Injectable({
  providedIn: 'root',
})
export class ServicePaginationState {
  private readonly KEY = 'main_page_saved_state';

  saveState(newState: Partial<MainPageStateModel>): void {
    try {
      let savedState = this.loadState();
      let updatedState = { ...savedState, ...newState };
      sessionStorage.setItem(this.KEY, JSON.stringify(updatedState));
    } catch { /* ignore */ }
  }

  loadState(): Partial<MainPageStateModel> {
    try {
      let raw_data = sessionStorage.getItem(this.KEY);

      if (raw_data) {
        return JSON.parse(raw_data);
      } else {
        return {};
      }

    } catch {
      return {};
    }
  }

  clearState(): void {
    sessionStorage.removeItem(this.KEY);
  }
}