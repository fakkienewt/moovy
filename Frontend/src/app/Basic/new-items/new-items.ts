import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; 
import { MovieNew } from '../../Models/MovieModel';
import { ServiceGetData } from '../../Services/service-get-data';

@Component({
  selector: 'app-new-items',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './new-items.html',
  styleUrl: './new-items.scss'
})
export class NewItems implements OnInit {
  allMovies: MovieNew[] = [];
  visibleMovies: MovieNew[] = [];
  isLoading = true;
  error = false;

  currentIndex = 0;
  itemsPerPage = 4;

  constructor(
    private movieService: ServiceGetData,
    private router: Router 
  ) {}

  ngOnInit(): void {
    this.movieService.getNewItems().subscribe({
      next: (data) => {
        this.allMovies = data;
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
    if (this.currentIndex + this.itemsPerPage < this.allMovies.length) {
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

  onSelectMovie(movie: MovieNew): void {
    if (movie?.id) {
      this.router.navigate(['/movie', movie.id]);
    }
  }

  private updateVisibleMovies(): void {
    this.visibleMovies = this.allMovies.slice(
      this.currentIndex,
      this.currentIndex + this.itemsPerPage
    );
  }
}