import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NewItems } from '../new-items/new-items';
import { ServiceGetData } from '../../Services/service-get-data';
import { Content } from '../../Models/ContentModel';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, NewItems],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main implements OnInit {
  allMovies: Content[] = [];
  paginatedMovies: Content[] = [];
  isLoading = true;

  currentPage = 1;
  itemsPerPage = 16;
  totalPages = 1;

  constructor(
    private movieService: ServiceGetData,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.movieService.getMovies().subscribe({
      next: (data) => {
        this.allMovies = data;
        this.totalPages = Math.ceil(this.allMovies.length / this.itemsPerPage);
        this.updatePage();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  backPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onSelectMovie(movie: Content): void {
    if (movie?.id) {
      this.router.navigate(['/content', movie.id]);
    }
  }

  onTabClick(): void { }

  private updatePage(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedMovies = this.allMovies.slice(start, end);
  }
}