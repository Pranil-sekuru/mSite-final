import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Hidden Markov Model Speech Detector
 *
 * Hidden states (Q):
 *   0 = SILENCE
 *   1 = SPEECH      (single voice / short utterance)
 *   2 = CONVERSATION (sustained back-and-forth)
 *
 * Observations (O) — quantised RMS energy:
 *   0 = QUIET  (rms < 0.01)
 *   1 = LOW    (rms < 0.05)
 *   2 = MED    (rms < 0.15)
 *   3 = HIGH   (rms >= 0.15)
 *
 * Parameters hand-tuned for typical indoor speech environments.
 * Matrices use log-probabilities internally to avoid underflow.
 */
export interface HmmResult {
  state: 'silence' | 'speech' | 'conversation';
  stateIndex: number;            // 0 | 1 | 2
  audioEnergyLevel: number;      // latest raw RMS 0–1
  confidence: number;            // Viterbi log-probability of best path
  frameCount: number;
}

@Injectable({ providedIn: 'root' })
export class HmmSpeechService implements OnDestroy {
  // ── HMM Parameters ──────────────────────────────────────────────────────

  /** Number of hidden states */
  private readonly N = 3;
  /** Number of observation symbols */
  private readonly M = 4;

  /**
   * Initial state distribution π (log)
   * Assume device starts in silence
   */
  private readonly logPi = [
    Math.log(0.85),  // SILENCE
    Math.log(0.10),  // SPEECH
    Math.log(0.05),  // CONVERSATION
  ];

  /**
   * Transition matrix A[i][j] = P(state_t = j | state_{t-1} = i)
   * Rows must sum to 1.
   *   SILENCE  tends to stay silent; occasional single utterance
   *   SPEECH   can return to silence or escalate to conversation
   *   CONVERSATION tends to persist
   */
  private readonly logA: number[][] = [
    [Math.log(0.80), Math.log(0.18), Math.log(0.02)],  // from SILENCE
    [Math.log(0.15), Math.log(0.55), Math.log(0.30)],  // from SPEECH
    [Math.log(0.05), Math.log(0.20), Math.log(0.75)],  // from CONVERSATION
  ];

  /**
   * Emission matrix B[j][k] = P(obs = k | state = j)
   * Columns: QUIET, LOW, MED, HIGH
   */
  private readonly logB: number[][] = [
    [Math.log(0.70), Math.log(0.20), Math.log(0.08), Math.log(0.02)],  // SILENCE
    [Math.log(0.10), Math.log(0.30), Math.log(0.45), Math.log(0.15)],  // SPEECH
    [Math.log(0.04), Math.log(0.16), Math.log(0.40), Math.log(0.40)],  // CONVERSATION
  ];

  private readonly STATE_LABELS: Array<'silence' | 'speech' | 'conversation'> =
    ['silence', 'speech', 'conversation'];

  // ── Audio API ────────────────────────────────────────────────────────────

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private frameBuffer = new Float32Array(2048);

  /** Raw RMS energy of each 100ms frame */
  private observationWindow: number[] = [];   // quantised symbols (0–3)
  private latestRms = 0;

  /** Frames per Viterbi window (30 frames × 100ms = 3s) */
  private readonly WINDOW_FRAMES = 30;
  private readonly FRAME_MS = 100;

  private frameInterval: ReturnType<typeof setInterval> | null = null;

  // ── Observable output ───────────────────────────────────────────────────

  private resultSubject = new BehaviorSubject<HmmResult>({
    state: 'silence',
    stateIndex: 0,
    audioEnergyLevel: 0,
    confidence: -Infinity,
    frameCount: 0
  });

  result$: Observable<HmmResult> = this.resultSubject.asObservable();

  private _isRunning = false;
  get isRunning(): boolean { return this._isRunning; }

  constructor(private ngZone: NgZone) { }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Request microphone access and start the HMM pipeline.
   * Resolves with `true` on success, `false` if permission denied.
   */
  async start(): Promise<boolean> {
    if (this._isRunning) return true;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,  // raw signal for energy estimation
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 16000
        }
      });
    } catch (err: any) {
      console.warn('[HmmSpeech] Microphone permission denied or unavailable:', err?.message);
      return false;
    }

    // Build Web Audio graph: mic → analyser
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000
    });
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.0; // no smoothing — we need raw frames

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    source.connect(this.analyser);
    // NOT connected to destination — no audio playback, just analysis

    this.frameBuffer = new Float32Array(this.analyser.fftSize);
    this.observationWindow = [];
    this._isRunning = true;

    // Sample a frame every FRAME_MS milliseconds
    this.frameInterval = setInterval(() => this.processFrame(), this.FRAME_MS);

    console.log('[HmmSpeech] Started — sampling Every', this.FRAME_MS, 'ms');
    return true;
  }

  /** Stop the audio pipeline and release microphone */
  stop(): void {
    if (!this._isRunning) return;

    if (this.frameInterval !== null) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this._isRunning = false;
    console.log('[HmmSpeech] Stopped');
  }

  ngOnDestroy(): void {
    this.stop();
  }

  // ── Audio Frame Processing ───────────────────────────────────────────────

  private processFrame(): void {
    if (!this.analyser) return;

    this.analyser.getFloatTimeDomainData(this.frameBuffer);

    // Compute RMS energy
    let sumSq = 0;
    for (let i = 0; i < this.frameBuffer.length; i++) {
      sumSq += this.frameBuffer[i] * this.frameBuffer[i];
    }
    const rms = Math.sqrt(sumSq / this.frameBuffer.length);
    this.latestRms = Math.min(rms, 1.0);

    // Quantise to observation symbol
    const obs = this.quantise(rms);
    this.observationWindow.push(obs);

    // Keep only the most recent WINDOW_FRAMES frames
    if (this.observationWindow.length > this.WINDOW_FRAMES) {
      this.observationWindow.shift();
    }

    // Run Viterbi once we have enough frames
    if (this.observationWindow.length >= this.WINDOW_FRAMES) {
      const { bestState, logProb } = this.viterbi(this.observationWindow);
      const result: HmmResult = {
        state: this.STATE_LABELS[bestState],
        stateIndex: bestState,
        audioEnergyLevel: Math.round(this.latestRms * 1000) / 1000,
        confidence: Math.round(logProb * 1000) / 1000,
        frameCount: this.observationWindow.length
      };

      this.ngZone.run(() => this.resultSubject.next(result));
    }
  }

  // ── Observation Quantisation ─────────────────────────────────────────────

  /**
   * Map RMS energy to one of M=4 discrete observation symbols.
   *   0 = QUIET, 1 = LOW, 2 = MED, 3 = HIGH
   */
  private quantise(rms: number): number {
    if (rms < 0.010) return 0;  // QUIET  — ambient noise / silence
    if (rms < 0.050) return 1;  // LOW    — whisper / distant sound
    if (rms < 0.150) return 2;  // MED    — normal speech
    return 3;                   // HIGH   — loud speech / close conversation
  }

  // ── Viterbi Decoder ──────────────────────────────────────────────────────

  /**
   * Standard Viterbi algorithm operating in log-probability space.
   *
   * @param observations  Array of quantised observation symbols (length T)
   * @returns  { bestState: number, logProb: number }
   *           bestState — index of most likely final hidden state
   *           logProb   — log-probability of the best path
   */
  viterbi(observations: number[]): { bestState: number; logProb: number } {
    const T = observations.length;
    const N = this.N;

    // δ[t][i] = max log-prob of any path ending in state i at time t
    const delta: number[][] = Array.from({ length: T }, () => new Array(N).fill(-Infinity));

    // ψ[t][i] = predecessor state that achieved max δ[t][i] (for backtracking)
    const psi: number[][] = Array.from({ length: T }, () => new Array(N).fill(0));

    // ── Initialisation ──
    const obs0 = observations[0];
    for (let i = 0; i < N; i++) {
      delta[0][i] = this.logPi[i] + this.logB[i][obs0];
      psi[0][i] = 0;
    }

    // ── Recursion ──
    for (let t = 1; t < T; t++) {
      const obst = observations[t];
      for (let j = 0; j < N; j++) {
        let maxVal = -Infinity;
        let maxState = 0;
        for (let i = 0; i < N; i++) {
          const val = delta[t - 1][i] + this.logA[i][j];
          if (val > maxVal) {
            maxVal = val;
            maxState = i;
          }
        }
        delta[t][j] = maxVal + this.logB[j][obst];
        psi[t][j] = maxState;
      }
    }

    // ── Termination — find best final state ──
    let bestState = 0;
    let bestLogProb = -Infinity;
    for (let i = 0; i < N; i++) {
      if (delta[T - 1][i] > bestLogProb) {
        bestLogProb = delta[T - 1][i];
        bestState = i;
      }
    }

    // (Backtrack is available via psi if full path needed — not required for streaming)
    return { bestState, logProb: bestLogProb };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Expose current raw RMS for dashboard display */
  getLatestRms(): number { return this.latestRms; }

  /** Expose current observation window for debugging */
  getObservationWindow(): number[] { return [...this.observationWindow]; }
}
