import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { HowItWorksPage } from './how-it-works.page';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild([{ path: '', component: HowItWorksPage }])],
  declarations: [HowItWorksPage]
})
export class HowItWorksPageModule {}
