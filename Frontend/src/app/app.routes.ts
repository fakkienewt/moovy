import { Routes } from '@angular/router';
import { Main } from './Basic/main/main';
import { MoviePage } from './ContentPages/movie-page/movie-page';

export const routes: Routes = [
    { path: '', component: Main },
    { path: 'movie/:id', component: MoviePage }
];
