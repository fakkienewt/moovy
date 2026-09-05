import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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

  playerUrl: string | null = null;
  safePlayerUrl: SafeResourceUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private movieService: ServiceGetData,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const movieId = +id;
      this.movieService.getNewItems().subscribe(items => {
        this.movie = items.find(m => m.id === movieId) || null;
        if (this.movie) {
          this.loadPlayer(movieId);
        }
      });
    }
  }

  loadPlayer(movieId: number): void {
    this.movieService.getPlayerLink(movieId).subscribe(res => {
      const url = res?.primary_player || (res?.players && res.players.length > 0 ? res.players[0] : null);
      if (url) {
        this.playerUrl = url;
        this.safePlayerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } else {
        this.playerUrl = null;
        this.safePlayerUrl = null;
      }
    }, error => {
      console.error('Ошибка загрузки плеера:', error);
      this.playerUrl = null;
      this.safePlayerUrl = null;
    });
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