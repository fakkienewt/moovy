import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ServiceGetData } from '../../Services/service-get-data';
import { Content } from '../../Models/ContentModel';

@Component({
  selector: 'app-new-items',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './new-items.html',
  styleUrl: './new-items.scss'
})
export class NewItems implements OnInit {
  newItems2026: Content[] = [];
  visibleMovies: Content[] = [];
  isLoading = true;
  error = false;

  currentIndex = 0;
  itemsPerPage = 4;
  isMobile = window.innerWidth <= 900;

  constructor(
    private movieService: ServiceGetData,
    private router: Router
  ) { }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth <= 900;
  }

  ngOnInit(): void {
    this.movieService.getContent({
      type: 'movie',
      year: 2026,
      limit: 10
    }).subscribe({
      next: (response) => {
        this.newItems2026 = response.items || [];
        this.updateVisibleMovies();
        this.isLoading = false;
      },
      error: () => {
        this.error = true;
        this.isLoading = false;
      }
    });
  }

  onNext(): void {
    if (this.currentIndex + this.itemsPerPage < this.newItems2026.length) {
      this.currentIndex++;
      this.updateVisibleMovies();
    }
  }

  onPrev(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateVisibleMovies();
    }
  }

  onSelectMovie(movie: Content): void {
    if (movie?.id) {
      this.router.navigate(['/content', 'movie', movie.id]);
    }
  }

  private updateVisibleMovies(): void {
    this.visibleMovies = this.newItems2026.slice(
      this.currentIndex,
      this.currentIndex + this.itemsPerPage
    );
  }
}