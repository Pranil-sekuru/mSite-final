import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TherapistPortalPageRoutingModule } from './therapist-portal-routing.module';

import { TherapistPortalPage } from './therapist-portal.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TherapistPortalPageRoutingModule
  ],
  declarations: [TherapistPortalPage]
})
export class TherapistPortalPageModule {}
