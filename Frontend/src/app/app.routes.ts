import { Routes } from '@angular/router';
import { Main } from './Basic/main/main';
import { ContentPage } from './ContentPages/movie-page/content-page';

export const routes: Routes = [
    { path: '', component: Main },
    { path: 'content/:id', component: ContentPage }
];
