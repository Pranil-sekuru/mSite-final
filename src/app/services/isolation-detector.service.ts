import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { SensorService } from './sensor.service';
import {
  IsolationState,
  LocationReading,
  ConversationReading,
  SensingConfig,
  DEFAULT_SENSING_CONFIG
} from '../models/sensor.models';

@Injectable({ providedIn: 'root' })
export class IsolationDetectorService {

  private isolationSubject = new BehaviorSubject<IsolationState>({
    isAlone: false,
    isHome: true,
    lastConversationMinutesAgo: 0,
    conversationCountToday: 0,
    isolationScore: 0,
    timestamp: Date.now(),
    triggerEma: false,
    currentHmmState: 'silence'
  });

  private triggerSubject = new BehaviorSubject<boolean>(false);
  private lastTriggerTime = 0;
  private config = { ...DEFAULT_SENSING_CONFIG };

  /** Current isolation state */
  isolationState$: Observable<IsolationState> = this.isolationSubject.asObservable();

  /** Fires `true` when an isolation event is detected that should trigger an EMA */
  isolationTrigger$: Observable<boolean> = this.triggerSubject.asObservable();

  constructor(private sensorService: SensorService) {
    this.subscribeToSensors();
  }

  updateConfig(config: Partial<SensingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Get a snapshot of the current isolation state */
  getCurrentState(): IsolationState {
    return this.isolationSubject.value;
  }

  // ── Private ──────────────────────────────────────────

  private subscribeToSensors(): void {
    combineLatest([
      this.sensorService.location$,
      this.sensorService.conversation$
    ]).pipe(
      filter(([loc, conv]) => loc !== null || conv !== null)
    ).subscribe(([location, conversation]) => {
      this.evaluateIsolation(location, conversation);
    });
  }

  private evaluateIsolation(
    location: LocationReading | null,
    conversation: ConversationReading | null
  ): void {
    const isHome = location?.isAtHome ?? true;
    const convCount = conversation?.conversationCount ?? 0;
    const lastConvMinAgo = this.sensorService.getLastConversationMinutesAgo();

    // ── Real-time HMM state ───────────────────────────────────────────────
    // hmmState reflects what the microphone detects RIGHT NOW:
    //   'conversation' → actively talking with someone  → not isolated
    //   'speech'       → talking (solo/on phone)        → mildly isolated
    //   'silence'      → no speech detected             → potentially isolated
    const hmmState = (conversation as any)?.hmmState ?? 'silence';
    const activelyConversing = hmmState === 'conversation';
    const activelySpeaking   = hmmState === 'speech';

    // isAlone: currently not in conversation AND recently few social contacts
    // Grace period: if last conversation was <30 min ago, not yet alone
    const recentlyConversed = lastConvMinAgo !== Infinity && lastConvMinAgo < 30;
    const isAlone = !activelyConversing && !recentlyConversed;

    // ── Isolation Score (0–1) ─────────────────────────────────────────────
    // Weights:
    //   Away from home            +0.25
    //   Currently silent (HMM)    +0.25  ← real-time mic signal
    //   Speech but not convo      +0.10  ← on phone / talking to self
    //   No conversation >30 min   +0.20
    //   No conversation >60 min   +0.20
    let score = 0;
    if (!isHome)             score += 0.25;
    if (hmmState === 'silence')      score += 0.25;
    if (activelySpeaking)            score += 0.10; // not truly isolated but not social
    if (lastConvMinAgo > 30)         score += 0.20;
    if (lastConvMinAgo > 60)         score += 0.20;
    // Active conversation cancels the silence penalty
    if (activelyConversing)          score  = Math.max(0, score - 0.25);
    score = Math.min(score, 1);

    const shouldTrigger = this.shouldTriggerEma(score, isAlone, isHome);

    const state: IsolationState = {
      isAlone,
      isHome,
      lastConversationMinutesAgo: lastConvMinAgo === Infinity ? -1 : lastConvMinAgo,
      conversationCountToday: convCount,
      isolationScore: Math.round(score * 100) / 100,
      timestamp: Date.now(),
      triggerEma: shouldTrigger,
      currentHmmState: hmmState
    };

    this.isolationSubject.next(state);

    if (shouldTrigger) {
      this.lastTriggerTime = Date.now();
      this.triggerSubject.next(true);
      setTimeout(() => this.triggerSubject.next(false), 1000);
    }
  }

  private shouldTriggerEma(score: number, isAlone: boolean, isHome: boolean): boolean {
    // Must be isolated (away AND alone)
    if (isHome || !isAlone) return false;

    // Score must be high enough
    if (score < 0.5) return false;

    // Don't trigger too frequently (minimum 30 minutes apart)
    const minInterval = this.config.isolationDurationMinutes * 60 * 1000;
    if (Date.now() - this.lastTriggerTime < minInterval) return false;

    return true;
  }
}
