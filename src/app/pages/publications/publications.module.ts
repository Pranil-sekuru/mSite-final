import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { PublicationsPage } from './publications.page';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild([{ path: '', component: PublicationsPage }])],
  declarations: [PublicationsPage]
})
export class PublicationsPageModule {}
