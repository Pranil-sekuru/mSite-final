import { Component, AfterViewInit, ViewChild, ElementRef, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { DataStorageService } from '../../services/data-storage.service';
import { SensorType, ConversationReading } from '../../models/sensor.models';

Chart.register(...registerables);

@Component({
  selector: 'app-evidence',
  templateUrl: './evidence.page.html',
  styleUrls: ['./evidence.page.scss'],
  standalone: false,
})
export class EvidencePage implements AfterViewInit, OnInit {
  @ViewChild('conversationsChart') conversationsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('homeTimeChart') homeTimeCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('deviceConvChart') deviceConvCanvas!: ElementRef<HTMLCanvasElement>;

  selectedCase = 'a';
  hasDeviceData = false;

  caseStudies: Record<string, { title: string; summary: string; details: string[] }> = {
    a: {
      title: 'Participant A',
      summary: 'Conversations increased and time spent at home decreased over 8 weeks — directly measurable social improvement through passive sensing.',
      details: [
        'Steady increase in daily conversations from week 1 to week 8',
        'Significant reduction in time spent at home',
        'High EMA response rate throughout the study',
        'Social functioning score improved by 35%'
      ]
    },
    b: {
      title: 'Participant B',
      summary: 'Struggled with app features but therapist-targeted messages helped confront social fears. Progressed toward volunteering at an animal shelter.',
      details: [
        'Initially struggled with technology adoption',
        'Therapist messages were the most impactful intervention component',
        'Gradually confronted social anxiety through belief challenging',
        'Set and achieved a concrete goal: volunteering at an animal shelter'
      ]
    }
  };

  constructor(private storage: DataStorageService) {}

  get currentCase() {
    return this.caseStudies[this.selectedCase];
  }

  async ngOnInit() {
    // Check if we have any device sensor data
    const todayConvs = await this.storage.getTodaySensorReadings(SensorType.CONVERSATION);
    this.hasDeviceData = todayConvs.length > 0;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.createConversationsChart();
      this.createHomeTimeChart();
      this.loadDeviceChart();
    }, 300);
  }

  createConversationsChart() {
    const ctx = this.conversationsCanvas?.nativeElement;
    if (!ctx) return;

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
        datasets: [{
          label: 'Conversations Per Week',
          data: [8, 11, 14, 18, 21, 25, 28, 32],
          borderColor: '#1D9E75',
          backgroundColor: 'rgba(29, 158, 117, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#1D9E75',
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#2E4A8E',
            titleFont: { family: 'Inter' },
            bodyFont: { family: 'Inter' },
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Conversations', font: { family: 'Inter', weight: 'bold' } },
            grid: { color: 'rgba(0,0,0,0.04)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  createHomeTimeChart() {
    const ctx = this.homeTimeCanvas?.nativeElement;
    if (!ctx) return;

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
        datasets: [{
          label: 'Hours at Home Per Day',
          data: [18, 17, 15.5, 14, 13, 11.5, 10, 9],
          borderColor: '#2E4A8E',
          backgroundColor: 'rgba(46, 74, 142, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2E4A8E',
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#2E4A8E',
            titleFont: { family: 'Inter' },
            bodyFont: { family: 'Inter' },
          }
        },
        scales: {
          y: {
            title: { display: true, text: 'Hours / Day', font: { family: 'Inter', weight: 'bold' } },
            grid: { color: 'rgba(0,0,0,0.04)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  async loadDeviceChart() {
    const todayConvs = await this.storage.getTodaySensorReadings(SensorType.CONVERSATION);
    if (todayConvs.length === 0) return;

    this.hasDeviceData = true;

    // Wait for the *ngIf to render the canvas
    setTimeout(() => {
      const ctx = this.deviceConvCanvas?.nativeElement;
      if (!ctx) return;

      // Group by hour and pick the max conversation count per hour
      const hourlyData: number[] = new Array(24).fill(0);
      for (const reading of todayConvs as ConversationReading[]) {
        const hour = new Date(reading.timestamp).getHours();
        hourlyData[hour] = Math.max(hourlyData[hour], reading.conversationCount);
      }

      const currentHour = new Date().getHours();
      const labels = [];
      const data = [];
      for (let h = 0; h <= currentHour; h++) {
        labels.push(`${h}:00`);
        data.push(hourlyData[h]);
      }

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Cumulative Conversations',
            data,
            backgroundColor: 'rgba(139, 92, 246, 0.6)',
            borderColor: '#8B5CF6',
            borderWidth: 2,
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#8B5CF6',
              titleFont: { family: 'Inter' },
              bodyFont: { family: 'Inter' },
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Conversations', font: { family: 'Inter', weight: 'bold' } },
              grid: { color: 'rgba(0,0,0,0.04)' }
            },
            x: {
              grid: { display: false },
              title: { display: true, text: 'Hour', font: { family: 'Inter', weight: 'bold' } }
            }
          }
        }
      });
    }, 200);
  }
}
