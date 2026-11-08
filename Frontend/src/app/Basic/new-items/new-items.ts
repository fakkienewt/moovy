import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ServiceGetData } from '../../Services/service-get-data';
import { ContentModel } from '../../Models/ContentModel';
import { ContentResponseModel } from '../../Models/ContentResponseModel';

@Component({
  selector: 'app-new-items',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './new-items.html',
  styleUrl: './new-items.scss'
})
export class NewItems implements OnInit {
  new_items_2026: ContentModel[] = [];
  visible_movies: ContentModel[] = [];
  is_loading = true;
  has_error = false;

  current_index = 0;
  items_per_page = 4;
  is_mobile = window.innerWidth <= 900;

  constructor(
    private service_content: ServiceGetData,
    private router: Router
  ) { }

  @HostListener('window:resize')
  OnResize(): void {
    this.is_mobile = window.innerWidth <= 900;
  }

  ngOnInit(): void {
    this.service_content.GetPaginatedContent({
      type: 'movie',
      year: 2026,
      limit: 10
    }).subscribe({
      next: (response: ContentResponseModel) => {
        this.new_items_2026 = response.items || [];
        this.UpdateVisibleMovies();
        this.is_loading = false;
      },
      error: () => {
        this.has_error = true;
        this.is_loading = false;
      }
    });
  }

  OnNext(): void {
    if (this.current_index + this.items_per_page < this.new_items_2026.length) {
      this.current_index++;
      this.UpdateVisibleMovies();
    }
  }

  OnPrev(): void {
    if (this.current_index > 0) {
      this.current_index--;
      this.UpdateVisibleMovies();
    }
  }

  OnSelectMovie(movie: ContentModel): void {
    if (movie?.id) {
      this.router.navigate(['/content', 'movie', movie.id]);
    }
  }

  private UpdateVisibleMovies(): void {
    this.visible_movies = this.new_items_2026.slice(
      this.current_index,
      this.current_index + this.items_per_page
    );
  }
}