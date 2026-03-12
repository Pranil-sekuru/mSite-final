import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'about',
    loadChildren: () => import('./pages/about/about.module').then(m => m.AboutPageModule)
  },
  {
    path: 'how-it-works',
    loadChildren: () => import('./pages/how-it-works/how-it-works.module').then(m => m.HowItWorksPageModule)
  },
  {
    path: 'the-app',
    loadChildren: () => import('./pages/the-app/the-app.module').then(m => m.TheAppPageModule)
  },
  {
    path: 'evidence',
    loadChildren: () => import('./pages/evidence/evidence.module').then(m => m.EvidencePageModule)
  },
  {
    path: 'team',
    loadChildren: () => import('./pages/team/team.module').then(m => m.TeamPageModule)
  },
  {
    path: 'publications',
    loadChildren: () => import('./pages/publications/publications.module').then(m => m.PublicationsPageModule)
  },
  {
    path: 'contact',
    loadChildren: () => import('./pages/contact/contact.module').then(m => m.ContactPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
