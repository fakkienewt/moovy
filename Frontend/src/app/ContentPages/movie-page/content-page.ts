import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ServiceGetData } from '../../Services/service-get-data';
import { Content } from '../../Models/ContentModel';

@Component({
  selector: 'app-content-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-page.html',
  styleUrl: './content-page.scss'
})
export class ContentPage implements OnInit {
  content: Content | null = null;
  isFavorite = false;
  isLater = false;

  playerUrl: string | null = null;
  safePlayerUrl: SafeResourceUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ServiceGetData,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const contentId = +id;

      this.contentService.getMovies().subscribe(items => {
        this.content = items.find(m => m.id === contentId) || null;

        if (this.content) {
          this.loadPlayer(contentId);
        } else {
          console.error(`Фильм с ID ${contentId} не найден в базе`);
        }
      });
    }
  }

  loadPlayer(contentId: number): void {
    this.contentService.getPlayerLink(contentId).subscribe(res => {
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

  onSelectContent(content: Content): void {
    if (content?.id) {
      this.router.navigate(['/content', content.id]);
    }
  }
}