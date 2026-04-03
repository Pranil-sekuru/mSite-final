import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Goal, EnjoyableActivity } from '../models/sensor.models';
import { EmaService } from './ema.service';

@Injectable({ providedIn: 'root' })
export class ClinicalInterventionsService {
  private readonly GOALS_KEY = 'clinical_goals';
  private readonly ACTIVITIES_KEY = 'clinical_activities';

  constructor(private emaService: EmaService) {}

  // ── Goals Management ────────────────────────────────────────────────

  async getGoals(): Promise<Goal[]> {
    return this.getArray<Goal>(this.GOALS_KEY);
  }

  async addGoal(title: string, type: 'short_term' | 'long_term'): Promise<Goal> {
    const goals = await this.getGoals();
    const newGoal: Goal = {
      id: this.generateId(),
      title,
      type,
      completed: false,
      createdAt: Date.now()
    };
    goals.push(newGoal);
    await Preferences.set({ key: this.GOALS_KEY, value: JSON.stringify(goals) });
    return newGoal;
  }

  async toggleGoal(id: string, completed: boolean): Promise<void> {
    const goals = await this.getGoals();
    const goal = goals.find(g => g.id === id);
    if (goal) {
      goal.completed = completed;
      await Preferences.set({ key: this.GOALS_KEY, value: JSON.stringify(goals) });
    }
  }

  // ── Enjoyable Activities Management ─────────────────────────────────

  async getActivities(): Promise<EnjoyableActivity[]> {
    return this.getArray<EnjoyableActivity>(this.ACTIVITIES_KEY);
  }

  async addActivity(title: string): Promise<EnjoyableActivity> {
    const activities = await this.getActivities();
    const newActivity: EnjoyableActivity = {
      id: this.generateId(),
      title,
      completed: false,
      createdAt: Date.now()
    };
    activities.push(newActivity);
    await Preferences.set({ key: this.ACTIVITIES_KEY, value: JSON.stringify(activities) });
    return newActivity;
  }

  async completeActivityAndSavor(id: string, pleasureRating: number): Promise<void> {
    const activities = await this.getActivities();
    const activity = activities.find(a => a.id === id);
    if (activity) {
      activity.completed = true;
      activity.pleasureRating = pleasureRating;
      activity.completedAt = Date.now();
      await Preferences.set({ key: this.ACTIVITIES_KEY, value: JSON.stringify(activities) });
      
      // Trigger Savoring EMA
      this.emaService.triggerSavoringPrompt(activity);
    }
  }

  async updateActivityNotes(id: string, notes: string): Promise<void> {
    const activities = await this.getActivities();
    const activity = activities.find(a => a.id === id);
    if (activity) {
      activity.savoringNotes = notes;
      await Preferences.set({ key: this.ACTIVITIES_KEY, value: JSON.stringify(activities) });
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private async getArray<T>(key: string): Promise<T[]> {
    const { value } = await Preferences.get({ key });
    if (!value) return [];
    try {
      return JSON.parse(value) as T[];
    } catch {
      return [];
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
