import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-evidence',
  templateUrl: './evidence.page.html',
  styleUrls: ['./evidence.page.scss'],
  standalone: false,
})
export class EvidencePage implements AfterViewInit {
  @ViewChild('conversationsChart') conversationsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('homeTimeChart') homeTimeCanvas!: ElementRef<HTMLCanvasElement>;

  selectedCase = 'a';

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

  get currentCase() {
    return this.caseStudies[this.selectedCase];
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.createConversationsChart();
      this.createHomeTimeChart();
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
}
