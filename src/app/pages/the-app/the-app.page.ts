import { Component } from '@angular/core';

interface EmaStep {
  title: string;
  icon: string;
  description: string;
  prompt: string;
  response?: string;
  color: string;
}

@Component({
  selector: 'app-the-app',
  templateUrl: './the-app.page.html',
  styleUrls: ['./the-app.page.scss'],
  standalone: false,
})
export class TheAppPage {
  showSimulator = false;
  currentStep = 0;

  emaSteps: EmaStep[] = [
    {
      title: 'Sensor Detection',
      icon: 'wifi-outline',
      description: 'The passive sensing pipeline detects your current context.',
      prompt: 'Detected: You are away from home and alone (low conversation count this morning).',
      color: '#3B8BD4'
    },
    {
      title: 'EMA Question',
      icon: 'chatbox-ellipses-outline',
      description: 'A context-aware EMA prompt is fired based on your situation.',
      prompt: 'How are you feeling about talking to people today?',
      response: 'Rate from 1 (very uncomfortable) to 5 (very comfortable)',
      color: '#1D9E75'
    },
    {
      title: 'Belief Appraisal',
      icon: 'help-circle-outline',
      description: 'The system assesses potential defeatist or threat beliefs.',
      prompt: 'Do you feel like people don\'t want to talk to you?',
      response: 'Yes / Sometimes / Not right now',
      color: '#E8A838'
    },
    {
      title: 'Therapist Message',
      icon: 'person-outline',
      description: 'A personalized challenge message from your therapist appears.',
      prompt: '"Remember what we discussed — that feeling is a thought, not a fact. Last week you had a great conversation at the coffee shop. You can do this."',
      color: '#8B5CF6'
    },
    {
      title: 'Savoring Prompt',
      icon: 'happy-outline',
      description: 'Reinforce positive social interactions from your recent past.',
      prompt: 'Think of a recent positive interaction and what made it good. Take a moment to savor that feeling.',
      response: 'Done ✓',
      color: '#1D9E75'
    },
  ];

  get progress(): number {
    return (this.currentStep + 1) / this.emaSteps.length;
  }

  get step(): EmaStep {
    return this.emaSteps[this.currentStep];
  }

  openSimulator() {
    this.currentStep = 0;
    this.showSimulator = true;
  }

  closeSimulator() {
    this.showSimulator = false;
    this.currentStep = 0;
  }

  nextStep() {
    if (this.currentStep < this.emaSteps.length - 1) {
      this.currentStep++;
    } else {
      this.closeSimulator();
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }
}
