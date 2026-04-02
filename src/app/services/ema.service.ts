import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IsolationDetectorService } from './isolation-detector.service';
import { DataStorageService } from './data-storage.service';
import { EmaPrompt, EmaResponse, IsolationState } from '../models/sensor.models';

@Injectable({ providedIn: 'root' })
export class EmaService {

  private pendingEmaSubject = new BehaviorSubject<EmaPrompt | null>(null);
  private emaHistorySubject = new BehaviorSubject<EmaResponse[]>([]);

  /** Currently pending EMA prompt (null when none) */
  pendingEma$: Observable<EmaPrompt | null> = this.pendingEmaSubject.asObservable();
  /** History of EMA responses in this session */
  emaHistory$: Observable<EmaResponse[]> = this.emaHistorySubject.asObservable();

  private todayEmaCounts = { morning: 0, context: 0, evening: 0 };
  private readonly MAX_EMAS_PER_DAY = 3;
  private triggerSub: Subscription | null = null;

  // ── EMA Prompt Templates ─────────────────────────────

  private morningPrompts: Omit<EmaPrompt, 'id' | 'timestamp' | 'triggerSource'>[] = [
    {
      type: 'morning_goal',
      title: 'Morning Goal Setting',
      question: 'What is one small social step you can take today toward your long-term goal?',
      responseOptions: ['Call a friend', 'Go to a public place', 'Start a conversation', 'Attend a group activity', 'Other']
    },
    {
      type: 'morning_goal',
      title: 'Daily Action Plan',
      question: 'How confident are you that you can take a social step today?',
      responseOptions: ['1 - Not at all', '2 - Slightly', '3 - Somewhat', '4 - Fairly', '5 - Very']
    }
  ];

  private contextAwarePrompts: Omit<EmaPrompt, 'id' | 'timestamp' | 'triggerSource' | 'isolationState'>[] = [
    {
      type: 'context_aware',
      title: 'Context-Aware Check-In',
      question: 'How are you feeling about talking to people right now?',
      responseOptions: ['1 - Very uncomfortable', '2 - Uncomfortable', '3 - Neutral', '4 - Comfortable', '5 - Very comfortable']
    },
    {
      type: 'context_aware',
      title: 'Belief Appraisal',
      question: 'Do you feel like people don\'t want to talk to you right now?',
      responseOptions: ['Yes', 'Sometimes', 'Not right now']
    },
    {
      type: 'context_aware',
      title: 'Therapist Message',
      question: '"Remember — that feeling is a thought, not a fact. Think about a recent positive interaction. You can do this."',
      responseOptions: ['I\'ll try', 'Need more time', 'Done ✓']
    }
  ];

  private eveningPrompts: Omit<EmaPrompt, 'id' | 'timestamp' | 'triggerSource'>[] = [
    {
      type: 'evening_reflection',
      title: 'Evening Reflection',
      question: 'Think of a positive social interaction today. Take a moment to savor that feeling.',
      responseOptions: ['I had a good interaction', 'It was okay', 'I didn\'t interact much today', 'Done ✓']
    },
    {
      type: 'evening_reflection',
      title: 'Daily Summary',
      question: 'How would you rate your overall social engagement today?',
      responseOptions: ['1 - Very low', '2 - Low', '3 - Average', '4 - Good', '5 - Excellent']
    }
  ];

  constructor(
    private isolationDetector: IsolationDetectorService,
    private storage: DataStorageService
  ) {
    this.loadTodayHistory();
  }

  // ── Start / Stop ─────────────────────────────────────

  startListening(): void {
    if (this.triggerSub) return;

    this.triggerSub = this.isolationDetector.isolationTrigger$.pipe(
      filter(triggered => triggered)
    ).subscribe(() => {
      this.fireContextAwareEma();
    });
  }

  stopListening(): void {
    if (this.triggerSub) {
      this.triggerSub.unsubscribe();
      this.triggerSub = null;
    }
  }

  // ── Fire EMAs ────────────────────────────────────────

  fireMorningEma(): void {
    if (this.getTotalEmasToday() >= this.MAX_EMAS_PER_DAY) return;
    if (this.todayEmaCounts.morning > 0) return;

    const template = this.morningPrompts[0];
    const prompt: EmaPrompt = {
      ...template,
      id: this.generateId(),
      timestamp: Date.now(),
      triggerSource: 'scheduled'
    };

    this.todayEmaCounts.morning++;
    this.pendingEmaSubject.next(prompt);
  }

  fireContextAwareEma(): void {
    if (this.getTotalEmasToday() >= this.MAX_EMAS_PER_DAY) return;
    if (this.todayEmaCounts.context >= 2) return; // Max 2 context-aware per day

    const templateIndex = this.todayEmaCounts.context % this.contextAwarePrompts.length;
    const template = this.contextAwarePrompts[templateIndex];
    const isolationState = this.isolationDetector.getCurrentState();

    const prompt: EmaPrompt = {
      ...template,
      id: this.generateId(),
      timestamp: Date.now(),
      triggerSource: 'sensor_triggered',
      isolationState
    };

    this.todayEmaCounts.context++;
    this.pendingEmaSubject.next(prompt);
  }

  fireEveningEma(): void {
    if (this.getTotalEmasToday() >= this.MAX_EMAS_PER_DAY) return;
    if (this.todayEmaCounts.evening > 0) return;

    const template = this.eveningPrompts[0];
    const prompt: EmaPrompt = {
      ...template,
      id: this.generateId(),
      timestamp: Date.now(),
      triggerSource: 'scheduled'
    };

    this.todayEmaCounts.evening++;
    this.pendingEmaSubject.next(prompt);
  }

  // ── Submit Response ──────────────────────────────────

  async submitResponse(promptId: string, response: string): Promise<void> {
    const pending = this.pendingEmaSubject.value;
    if (!pending || pending.id !== promptId) return;

    const emaResponse: EmaResponse = {
      promptId,
      type: pending.type,
      response,
      responseTimestamp: Date.now(),
      reactionTimeMs: Date.now() - pending.timestamp
    };

    await this.storage.saveEmaResponse(emaResponse);

    const history = [...this.emaHistorySubject.value, emaResponse];
    this.emaHistorySubject.next(history);

    // Clear pending
    this.pendingEmaSubject.next(null);
  }

  dismissEma(): void {
    this.pendingEmaSubject.next(null);
  }

  // ── Getters ──────────────────────────────────────────

  getTotalEmasToday(): number {
    return this.todayEmaCounts.morning + this.todayEmaCounts.context + this.todayEmaCounts.evening;
  }

  async getFullHistory(): Promise<EmaResponse[]> {
    return this.storage.getEmaHistory();
  }

  // ── Private ──────────────────────────────────────────

  private async loadTodayHistory(): Promise<void> {
    const today = await this.storage.getTodayEmaResponses();
    this.emaHistorySubject.next(today);

    // Reconstruct today's counts
    for (const r of today) {
      if (r.type === 'morning_goal') this.todayEmaCounts.morning++;
      else if (r.type === 'context_aware') this.todayEmaCounts.context++;
      else if (r.type === 'evening_reflection') this.todayEmaCounts.evening++;
    }
  }

  private generateId(): string {
    return `ema-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
