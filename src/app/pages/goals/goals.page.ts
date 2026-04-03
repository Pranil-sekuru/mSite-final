import { Component, OnInit } from '@angular/core';
import { ClinicalInterventionsService } from '../../services/clinical-interventions.service';
import { Goal, EnjoyableActivity } from '../../models/sensor.models';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-goals',
  templateUrl: './goals.page.html',
  styleUrls: ['./goals.page.scss'],
  standalone: false,
})
export class GoalsPage implements OnInit {
  currentSegment: 'goals' | 'activities' = 'goals';
  
  goals: Goal[] = [];
  activities: EnjoyableActivity[] = [];

  constructor(
    private interventionsService: ClinicalInterventionsService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.goals = await this.interventionsService.getGoals();
    this.activities = await this.interventionsService.getActivities();
  }

  // ── Goals ─────────────────────────────────────────────────────────

  async promptAddGoal() {
    const alert = await this.alertCtrl.create({
      header: 'New Goal',
      inputs: [
        { name: 'title', type: 'text', placeholder: 'e.g. Call my parents' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Add Short-Term', 
          handler: (data) => { if (data.title) this.addGoal(data.title, 'short_term'); } 
        },
        { 
          text: 'Add Long-Term', 
          handler: (data) => { if (data.title) this.addGoal(data.title, 'long_term'); } 
        }
      ]
    });
    await alert.present();
  }

  async addGoal(title: string, type: 'short_term' | 'long_term') {
    await this.interventionsService.addGoal(title, type);
    this.loadData();
  }

  async toggleGoal(goal: Goal) {
    goal.completed = !goal.completed;
    await this.interventionsService.toggleGoal(goal.id, goal.completed);
    this.loadData();
  }

  // ── Activities ───────────────────────────────────────────────────

  async promptAddActivity() {
    const alert = await this.alertCtrl.create({
      header: 'Enjoyable Activity',
      message: 'Plan something small that brings you joy.',
      inputs: [
        { name: 'title', type: 'text', placeholder: 'e.g. Listen to an album' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Add', 
          handler: (data) => { if (data.title) this.addActivity(data.title); } 
        }
      ]
    });
    await alert.present();
  }

  async addActivity(title: string) {
    await this.interventionsService.addActivity(title);
    this.loadData();
  }

  async completeActivityFlow(activity: EnjoyableActivity) {
    if (activity.completed) return; // already done

    const alert = await this.alertCtrl.create({
      header: 'Rate Your Pleasure',
      message: `How much did you enjoy "${activity.title}"?`,
      inputs: [
        { name: 'rating', type: 'number', min: 1, max: 10, placeholder: '1-10 rating' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Submit & Savor', 
          handler: async (data) => { 
            const rating = parseInt(data.rating, 10);
            if (rating >= 1 && rating <= 10) {
              await this.interventionsService.completeActivityAndSavor(activity.id, rating);
              this.loadData();
              
              const toast = await this.toastCtrl.create({
                message: 'Check your dashboard for a savoring prompt!',
                duration: 3000,
                color: 'success',
                icon: 'leaf-outline'
              });
              toast.present();
            }
          } 
        }
      ]
    });
    await alert.present();
  }
}
