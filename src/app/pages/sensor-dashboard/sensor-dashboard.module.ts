import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { SensorDashboardPage } from './sensor-dashboard.page';

const routes: Routes = [
  { path: '', component: SensorDashboardPage }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [SensorDashboardPage]
})
export class SensorDashboardPageModule {}
