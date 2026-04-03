import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Motion } from '@capacitor/motion';
import {
  SensorType,
  SensorState,
  SensorStatus,
  LocationReading,
  ActivityReading,
  ConversationReading,
  PhoneUsageReading,
  SensingConfig,
  DEFAULT_SENSING_CONFIG,
  HomeGeofence
} from '../models/sensor.models';
import { DataStorageService } from './data-storage.service';
import { HmmSpeechService } from './hmm-speech.service';

@Injectable({ providedIn: 'root' })
export class SensorService {
  // ── Observable streams for each sensor ──────────────
  private locationSubject = new BehaviorSubject<LocationReading | null>(null);
  private activitySubject = new BehaviorSubject<ActivityReading | null>(null);
  private conversationSubject = new BehaviorSubject<ConversationReading | null>(null);
  private phoneUsageSubject = new BehaviorSubject<PhoneUsageReading | null>(null);
  private sensingActiveSubject = new BehaviorSubject<boolean>(false);

  // Sensor status tracking
  private statusSubject = new BehaviorSubject<Map<SensorType, SensorStatus>>(
    new Map([
      [SensorType.LOCATION, { sensorType: SensorType.LOCATION, state: SensorState.INACTIVE, lastReading: null }],
      [SensorType.ACTIVITY, { sensorType: SensorType.ACTIVITY, state: SensorState.INACTIVE, lastReading: null }],
      [SensorType.CONVERSATION, { sensorType: SensorType.CONVERSATION, state: SensorState.INACTIVE, lastReading: null }],
      [SensorType.PHONE_USAGE, { sensorType: SensorType.PHONE_USAGE, state: SensorState.INACTIVE, lastReading: null }],
    ])
  );

  // Public observables
  location$: Observable<LocationReading | null> = this.locationSubject.asObservable();
  activity$: Observable<ActivityReading | null> = this.activitySubject.asObservable();
  conversation$: Observable<ConversationReading | null> = this.conversationSubject.asObservable();
  phoneUsage$: Observable<PhoneUsageReading | null> = this.phoneUsageSubject.asObservable();
  sensingActive$: Observable<boolean> = this.sensingActiveSubject.asObservable();
  sensorStatus$: Observable<Map<SensorType, SensorStatus>> = this.statusSubject.asObservable();

  // Internal state
  private config: SensingConfig = { ...DEFAULT_SENSING_CONFIG };
  private locationWatchId: string | null = null;
  private motionListener: any = null;
  private conversationSub: Subscription | null = null;
  private phoneUsageSub: Subscription | null = null;
  private stepCount = 0;
  private lastAccelMagnitude = 0;
  private dailyConversationCount = 0;
  private lastConversationTimestamp = 0;

  // ── Sliding-window accelerometer buffer ─────────────
  private readonly ACCEL_WINDOW = 50;       // samples (~5s at 10Hz)
  private accelBuffer: number[] = [];       // magnitude history
  private windowVariance = 0;
  private windowPeakCount = 0;
  private currentGait: 'sedentary' | 'walking' | 'running' = 'sedentary';

  constructor(
    private ngZone: NgZone,
    private storage: DataStorageService,
    private hmmSpeech: HmmSpeechService
  ) {}

  // ── Lifecycle ────────────────────────────────────────

  async startSensing(config?: Partial<SensingConfig>): Promise<void> {
    if (this.sensingActiveSubject.value) return;

    // Load stored config or use provided
    const storedConfig = await this.storage.getConfig();
    this.config = { ...storedConfig, ...config };

    this.sensingActiveSubject.next(true);

    await this.startLocationSensing();
    await this.startActivitySensing();
    this.startConversationSensing();
    this.startPhoneUsageSensing();
  }

  async stopSensing(): Promise<void> {
    this.sensingActiveSubject.next(false);

    // Stop location
    if (this.locationWatchId) {
      await Geolocation.clearWatch({ id: this.locationWatchId });
      this.locationWatchId = null;
    }

    // Stop motion
    if (this.motionListener) {
      this.motionListener.remove();
      this.motionListener = null;
    }

    // Stop HMM speech pipeline and release microphone
    this.hmmSpeech.stop();

    // Stop conversation subscription
    if (this.conversationSub) {
      this.conversationSub.unsubscribe();
      this.conversationSub = null;
    }

    // Stop phone usage simulation
    if (this.phoneUsageSub) {
      this.phoneUsageSub.unsubscribe();
      this.phoneUsageSub = null;
    }

    // Reset accel buffer
    this.accelBuffer = [];

    // Set all sensors to inactive
    this.updateAllStatus(SensorState.INACTIVE);
  }

  // ── Set Home Location ────────────────────────────────

  async setHomeLocation(lat: number, lng: number, radiusMeters = 100): Promise<void> {
    this.config.homeGeofence = { latitude: lat, longitude: lng, radiusMeters };
    await this.storage.saveHomeLocation(this.config.homeGeofence);
  }

  async setCurrentLocationAsHome(): Promise<void> {
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      await this.setHomeLocation(pos.coords.latitude, pos.coords.longitude);
    } catch (err) {
      console.error('Cannot get current location for home:', err);
    }
  }

  // ── Location Sensing ─────────────────────────────────

  private async startLocationSensing(): Promise<void> {
    try {
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        this.updateStatus(SensorType.LOCATION, SensorState.PERMISSION_NEEDED, 'Location permission denied');
        return;
      }

      this.updateStatus(SensorType.LOCATION, SensorState.ACTIVE);

      this.locationWatchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true },
        (position: Position | null, err?: any) => {
          this.ngZone.run(() => {
            if (err || !position) {
              this.updateStatus(SensorType.LOCATION, SensorState.ERROR, err?.message || 'Unknown error');
              return;
            }

            const reading: LocationReading = {
              id: this.generateId(),
              timestamp: Date.now(),
              sensorType: SensorType.LOCATION,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              isAtHome: this.isWithinGeofence(
                position.coords.latitude,
                position.coords.longitude,
                this.config.homeGeofence
              )
            };

            this.locationSubject.next(reading);
            this.updateStatus(SensorType.LOCATION, SensorState.ACTIVE);
            this.storage.saveSensorReading(reading);
          });
        }
      );
    } catch (err: any) {
      this.updateStatus(SensorType.LOCATION, SensorState.ERROR, err?.message || 'Location not available');
    }
  }

  // ── Activity / Motion Sensing ────────────────────────

  private async startActivitySensing(): Promise<void> {
    try {
      // Request permission (needed on iOS 13+ WKWebView)
      if (typeof (DeviceMotionEvent as any) !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permissionState = await (DeviceMotionEvent as any).requestPermission();
        if (permissionState !== 'granted') {
            throw new Error('DeviceMotionEvent permission denied by user');
        }
      }

      this.updateStatus(SensorType.ACTIVITY, SensorState.ACTIVE);

      this.motionListener = await Motion.addListener('accel', (event) => {
        this.ngZone.run(() => {
          const { x, y, z } = event.acceleration || { x: 0, y: 0, z: 0 };
          // Remove gravity component with high-pass: use raw magnitude
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          this.lastAccelMagnitude = magnitude;

          // ── Update sliding window ─────────────────────────
          this.accelBuffer.push(magnitude);
          if (this.accelBuffer.length > this.ACCEL_WINDOW) {
            this.accelBuffer.shift();
          }

          // ── Extract window features ───────────────────────
          if (this.accelBuffer.length === this.ACCEL_WINDOW) {
            this.computeWindowFeatures();
          }

          // Step detection: peak above threshold
          // Note: iOS 'event.acceleration' is user-acceleration (gravity removed), so baseline is 0.0.
          // We look for a sharp swing of at least 2.0 m/s² to qualify as a footstep.
          const stepThreshold = 2.0; 
          if (magnitude > stepThreshold && this.lastAccelMagnitude < stepThreshold && this.currentGait !== 'sedentary') {
            this.stepCount++;
          }

          const reading: ActivityReading = {
            id: this.generateId(),
            timestamp: Date.now(),
            sensorType: SensorType.ACTIVITY,
            steps: this.stepCount,
            isMoving: this.currentGait !== 'sedentary',
            intensity: this.gaitToIntensity(this.currentGait),
            accelerationMagnitude: Math.round(magnitude * 100) / 100,
            gaitActivity: this.currentGait,
            windowVariance: Math.round(this.windowVariance * 10000) / 10000,
            peakCount: this.windowPeakCount
          };

          this.activitySubject.next(reading);
          this.updateStatus(SensorType.ACTIVITY, SensorState.ACTIVE);
          this.storage.saveSensorReading(reading);
        });
      });
    } catch (err: any) {
      // Fallback: simulate activity data
      console.warn('Motion API not available, using simulation:', err?.message);
      this.startSimulatedActivity();
    }
  }

  /**
   * Sliding-window feature extraction + rule-based gait classifier.
   *
   * Features:
   *   variance      — spread of magnitudes; low when stationary
   *   peakCount     — number of magnitude spikes (proxy for steps/cadence)
   *
   * Rules (tuned for strict thresholding to ignore hand jitter):
   *   walking   : variance > 2.0  AND  peakCount >= 4
   *   running   : variance > 8.0  AND  peakCount >= 8
   */
  private computeWindowFeatures(): void {
    const n = this.accelBuffer.length;
    const mean = this.accelBuffer.reduce((a, b) => a + b, 0) / n;

    // Variance
    const variance = this.accelBuffer.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
    this.windowVariance = variance;

    // Peak count: local maxima above mean + dynamic threshold
    // Using Math.max guarantees that tiny hand jitters (variance near 0) don't count as peaks.
    // An absolute minimum of 1.0 m/s² swing above the mean is required.
    const stddev = Math.sqrt(variance);
    const peakThreshold = mean + Math.max(1.0, 0.5 * stddev);
    
    let peaks = 0;
    for (let i = 1; i < n - 1; i++) {
      if (
        this.accelBuffer[i] > peakThreshold &&
        this.accelBuffer[i] > this.accelBuffer[i - 1] &&
        this.accelBuffer[i] > this.accelBuffer[i + 1]
      ) {
        peaks++;
      }
    }
    this.windowPeakCount = peaks;

    // Strict Gait classification
    if (variance > 8.0 && peaks >= 8) {
      this.currentGait = 'running';
    } else if (variance > 2.0 && peaks >= 4) {
      this.currentGait = 'walking';
    } else {
      this.currentGait = 'sedentary';
    }
  }

  private gaitToIntensity(gait: 'sedentary' | 'walking' | 'running'): 'sedentary' | 'light' | 'moderate' | 'vigorous' {
    if (gait === 'running') return 'vigorous';
    if (gait === 'walking') return 'moderate';
    return 'sedentary';
  }

  private startSimulatedActivity(): void {
    this.updateStatus(SensorType.ACTIVITY, SensorState.ACTIVE);
    const sub = interval(this.config.activityIntervalMs).subscribe(() => {
      this.stepCount += Math.floor(Math.random() * 5);
      const magnitude = 0.5 + Math.random() * 3;
      this.lastAccelMagnitude = magnitude;
      const gait: 'sedentary' | 'walking' | 'running' =
        magnitude < 1.5 ? 'sedentary' : magnitude < 2.5 ? 'walking' : 'running';

      const reading: ActivityReading = {
        id: this.generateId(),
        timestamp: Date.now(),
        sensorType: SensorType.ACTIVITY,
        steps: this.stepCount,
        isMoving: gait !== 'sedentary',
        intensity: this.gaitToIntensity(gait),
        accelerationMagnitude: Math.round(magnitude * 100) / 100,
        gaitActivity: gait,
        windowVariance: Math.random() * 2,
        peakCount: Math.floor(Math.random() * 10)
      };

      this.activitySubject.next(reading);
      this.storage.saveSensorReading(reading);
    });

    // Store as motionListener so stopSensing can clean up
    this.motionListener = { remove: () => sub.unsubscribe() };
  }

  // ── Conversation Sensing — HMM/Viterbi Speech Detector ──

  private async startConversationSensing(): Promise<void> {
    this.updateStatus(SensorType.CONVERSATION, SensorState.ACTIVE);
    this.dailyConversationCount = 0;

    // Attempt to start the real HMM speech pipeline
    const micGranted = await this.hmmSpeech.start();

    if (micGranted) {
      // Subscribe to HMM results (emitted every 3s once window fills)
      this.conversationSub = this.hmmSpeech.result$.subscribe(result => {
        this.ngZone.run(() => {
          const isConversation = result.state === 'conversation';
          const isSpeech = result.state === 'speech';

          if (isConversation) {
            this.dailyConversationCount++;
            this.lastConversationTimestamp = Date.now();
          }

          const reading: ConversationReading = {
            id: this.generateId(),
            timestamp: Date.now(),
            sensorType: SensorType.CONVERSATION,
            conversationDetected: isConversation,
            conversationCount: this.dailyConversationCount,
            estimatedDurationMinutes: isConversation ? 1 : 0, // increments over time
            hmmState: result.state,
            audioEnergyLevel: result.audioEnergyLevel,
            confidence: result.confidence
          };

          this.conversationSubject.next(reading);
          this.updateStatus(SensorType.CONVERSATION, SensorState.ACTIVE);
          this.storage.saveSensorReading(reading);
        });
      });
    } else {
      // Microphone not available — fall back to probabilistic simulation
      console.warn('[SensorService] Mic unavailable, using conversation simulation');
      this.startSimulatedConversation();
    }
  }

  /** Probabilistic fallback when microphone permission is denied */
  private startSimulatedConversation(): void {
    this.conversationSub = interval(this.config.conversationIntervalMs).subscribe(() => {
      const hour = new Date().getHours();
      const isSocialHour = hour >= 10 && hour <= 20;
      const detected = Math.random() < (isSocialHour ? 0.3 : 0.05);

      if (detected) {
        this.dailyConversationCount++;
        this.lastConversationTimestamp = Date.now();
      }

      const reading: ConversationReading = {
        id: this.generateId(),
        timestamp: Date.now(),
        sensorType: SensorType.CONVERSATION,
        conversationDetected: detected,
        conversationCount: this.dailyConversationCount,
        estimatedDurationMinutes: detected ? Math.floor(Math.random() * 15) + 1 : 0,
        hmmState: detected ? 'conversation' : 'silence',
        audioEnergyLevel: 0,
        confidence: 0
      };

      this.conversationSubject.next(reading);
      this.storage.saveSensorReading(reading);
    });
  }

  // ── Phone Usage Sensing (Simulated) ──────────────────

  private startPhoneUsageSensing(): void {
    this.updateStatus(SensorType.PHONE_USAGE, SensorState.ACTIVE);

    this.phoneUsageSub = interval(this.config.phoneUsageIntervalMs).subscribe(() => {
      const reading: PhoneUsageReading = {
        id: this.generateId(),
        timestamp: Date.now(),
        sensorType: SensorType.PHONE_USAGE,
        screenOn: true, // Always true when app is running
        callActive: Math.random() < 0.02, // 2% chance of active call
        appUsageMinutes: Math.floor(Math.random() * 120)
      };

      this.phoneUsageSubject.next(reading);
      this.updateStatus(SensorType.PHONE_USAGE, SensorState.ACTIVE);
      this.storage.saveSensorReading(reading);
    });
  }

  // ── Public getters ───────────────────────────────────

  getLastConversationMinutesAgo(): number {
    if (this.lastConversationTimestamp === 0) return Infinity;
    return Math.floor((Date.now() - this.lastConversationTimestamp) / 60000);
  }

  getDailyConversationCount(): number {
    return this.dailyConversationCount;
  }

  getStepCount(): number {
    return this.stepCount;
  }

  // ── Helpers ──────────────────────────────────────────

  private isWithinGeofence(lat: number, lng: number, geofence: HomeGeofence): boolean {
    if (geofence.latitude === 0 && geofence.longitude === 0) return false; // Not configured

    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat - geofence.latitude);
    const dLon = this.toRad(lng - geofence.longitude);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(geofence.latitude)) * Math.cos(this.toRad(lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= geofence.radiusMeters;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private classifyIntensity(magnitude: number): 'sedentary' | 'light' | 'moderate' | 'vigorous' {
    if (magnitude < 1) return 'sedentary';
    if (magnitude < 3) return 'light';
    if (magnitude < 8) return 'moderate';
    return 'vigorous';
  }

  /** Expose HMM service for dashboard visualisation */
  getHmmSpeechService(): HmmSpeechService {
    return this.hmmSpeech;
  }

  private updateStatus(type: SensorType, state: SensorState, errorMessage?: string): void {
    const map = new Map(this.statusSubject.value);
    map.set(type, {
      sensorType: type,
      state,
      lastReading: state === SensorState.ACTIVE ? Date.now() : (map.get(type)?.lastReading ?? null),
      errorMessage
    });
    this.statusSubject.next(map);
  }

  private updateAllStatus(state: SensorState): void {
    for (const type of Object.values(SensorType)) {
      this.updateStatus(type, state);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
