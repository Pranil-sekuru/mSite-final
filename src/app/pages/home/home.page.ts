import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage {
  stats = [
    { value: '77%', label: 'Average EMA Adherence Rate' },
    { value: '46%', label: 'Context-Aware EMAs (Sensor-Triggered)' },
    { value: '3/day', label: 'Maximum EMAs Per Day' },
    { value: '8 wk', label: 'Blended Intervention Program' },
  ];
}
