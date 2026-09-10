import { Component, OnInit } from '@angular/core';
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
  allMovies: Content[] = [];
  newItems2026: Content[] = [];
  visibleMovies: Content[] = [];
  isLoading = true;
  error = false;

  currentIndex = 0;
  itemsPerPage = 4;

  constructor(
    private movieService: ServiceGetData,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.movieService.getMovies().subscribe({
      next: (data) => {
        this.allMovies = data;
        this.newItems2026 = data
          .filter(m => m.year === 2026)
          .slice(0, 10);

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
