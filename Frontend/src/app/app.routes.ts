import { Routes } from '@angular/router';
import { Main } from './Basic/main/main';
import { ContentPage } from './ContentPages/movie-page/content-page';
import { Authorization } from './Forms/authorization/authorization';
import { Login } from './Forms/login/login';

export const routes: Routes = [
    { path: '', component: Main },
    { path: 'content/:type/:id', component: ContentPage },
    { path: 'auth', component: Authorization },
    { path: 'login', component: Login },
];