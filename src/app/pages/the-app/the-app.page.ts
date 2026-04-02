import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SensorService } from '../../services/sensor.service';
import { IsolationDetectorService } from '../../services/isolation-detector.service';
import {
  LocationReading,
  ConversationReading,
  IsolationState
} from '../../models/sensor.models';

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
export class TheAppPage implements OnInit, OnDestroy {
  showSimulator = false;
  currentStep = 0;
  liveMode = false;

  // Live sensor data
  liveLocation: LocationReading | null = null;
  liveConversation: ConversationReading | null = null;
  liveIsolation: IsolationState | null = null;
  isSensing = false;

  private subs: Subscription[] = [];

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

  constructor(
    private sensorService: SensorService,
    private isolationDetector: IsolationDetectorService
  ) {}

  ngOnInit() {
    this.subs.push(
      this.sensorService.sensingActive$.subscribe(active => this.isSensing = active),
      this.sensorService.location$.subscribe(loc => {
        this.liveLocation = loc;
        this.updateLiveSensorStep();
      }),
      this.sensorService.conversation$.subscribe(conv => {
        this.liveConversation = conv;
        this.updateLiveSensorStep();
      }),
      this.isolationDetector.isolationState$.subscribe(state => {
        this.liveIsolation = state;
        this.updateLiveSensorStep();
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  get progress(): number {
    return (this.currentStep + 1) / this.emaSteps.length;
  }

  get step(): EmaStep {
    return this.emaSteps[this.currentStep];
  }

  toggleLiveMode() {
    this.liveMode = !this.liveMode;
    if (this.liveMode) {
      this.updateLiveSensorStep();
    } else {
      // Reset to default prompt
      this.emaSteps[0].prompt = 'Detected: You are away from home and alone (low conversation count this morning).';
    }
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

  private updateLiveSensorStep() {
    if (!this.liveMode || !this.isSensing) return;

    const loc = this.liveLocation;
    const conv = this.liveConversation;
    const iso = this.liveIsolation;

    let locationStr = loc ? (loc.isAtHome ? '🏠 At Home' : '🚶 Away from home') : 'Acquiring GPS…';
    let convStr = conv ? `${conv.conversationCount} conversation(s) detected today` : 'Listening…';
    let isoStr = iso ? `Isolation score: ${(iso.isolationScore * 100).toFixed(0)}%` : '';

    this.emaSteps[0].prompt = `📡 Live Data:\n${locationStr}\n${convStr}\n${isoStr}`;
  }
}
