import { Component } from '@angular/core';
import { MenuController } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  pages = [
    { title: 'Home', url: '/home', icon: 'home-outline' },
    { title: 'About mSITE', url: '/about', icon: 'information-circle-outline' },
    { title: 'How It Works', url: '/how-it-works', icon: 'layers-outline' },
    { title: 'The App', url: '/the-app', icon: 'phone-portrait-outline' },
    { title: 'Sensor Dashboard', url: '/sensor-dashboard', icon: 'pulse-outline' },
    { title: 'Clinical Evidence', url: '/evidence', icon: 'bar-chart-outline' },
    { title: 'Team', url: '/team', icon: 'people-outline' },
    { title: 'Publications', url: '/publications', icon: 'document-text-outline' },
    { title: 'Contact', url: '/contact', icon: 'mail-outline' },
  ];

  constructor(private menuCtrl: MenuController) {}

  closeMenu() {
    this.menuCtrl.close('main-menu');
  }
}
