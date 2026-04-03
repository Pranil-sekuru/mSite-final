import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TherapistPortalPage } from './therapist-portal.page';

const routes: Routes = [
  {
    path: '',
    component: TherapistPortalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TherapistPortalPageRoutingModule {}
