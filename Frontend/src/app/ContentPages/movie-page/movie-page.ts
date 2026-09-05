import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiceGetData } from '../../Services/service-get-data';
import { MovieNew } from '../../Models/MovieModel';

@Component({
  selector: 'app-movie-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './movie-page.html',
  styleUrl: './movie-page.scss'
})
export class MoviePage implements OnInit {
  movie: MovieNew | null = null;
  isFavorite = false;
  isLater = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private movieService: ServiceGetData
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id) {
      this.movieService.getNewItems().subscribe(items => {
        this.movie = items.find(m => m.id === +id) || null;
      });
    }
  }

  toggleFavorite(): void {
    this.isFavorite = !this.isFavorite;
  }

  toggleLater(): void {
    this.isLater = !this.isLater;
  }

  onSelectMovie(movie: MovieNew): void {
    if (movie?.id) {
      this.router.navigate(['/movie', movie.id]);
    }
  }
}