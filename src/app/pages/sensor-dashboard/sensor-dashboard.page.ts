import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SensorService } from '../../services/sensor.service';
import { IsolationDetectorService } from '../../services/isolation-detector.service';
import { EmaService } from '../../services/ema.service';
import { DataStorageService } from '../../services/data-storage.service';
import {
  SensorType,
  SensorState,
  SensorStatus,
  LocationReading,
  ActivityReading,
  ConversationReading,
  PhoneUsageReading,
  IsolationState,
  EmaPrompt
} from '../../models/sensor.models';

@Component({
  selector: 'app-sensor-dashboard',
  templateUrl: './sensor-dashboard.page.html',
  styleUrls: ['./sensor-dashboard.page.scss'],
  standalone: false,
})
export class SensorDashboardPage implements OnInit, OnDestroy {
  // Sensing state
  isSensing = false;

  // Latest readings
  location: LocationReading | null = null;
  activity: ActivityReading | null = null;
  conversation: ConversationReading | null = null;
  phoneUsage: PhoneUsageReading | null = null;

  // Isolation state
  isolation: IsolationState | null = null;

  // Sensor statuses
  statuses: Map<SensorType, SensorStatus> = new Map();

  // EMA
  pendingEma: EmaPrompt | null = null;
  emaCountToday = 0;

  // Storage stats
  totalReadings = 0;
  totalEma = 0;

  // Activity history (last 10 readings for mini chart display)
  activityHistory: number[] = [];
  conversationHistory: number[] = [];

  private subs: Subscription[] = [];

  // Expose enums to template
  SensorType = SensorType;
  SensorState = SensorState;

  constructor(
    private sensorService: SensorService,
    private isolationDetector: IsolationDetectorService,
    private emaService: EmaService,
    private storage: DataStorageService
  ) {}

  ngOnInit() {
    this.subscribeToStreams();
    this.loadStats();
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── Toggle Sensing ───────────────────────────────────

  async toggleSensing() {
    if (this.isSensing) {
      await this.sensorService.stopSensing();
      this.emaService.stopListening();
      this.isSensing = false;
    } else {
      await this.sensorService.startSensing();
      this.emaService.startListening();
      this.isSensing = true;
    }
  }

  async setCurrentAsHome() {
    await this.sensorService.setCurrentLocationAsHome();
  }

  // ── EMA Actions ──────────────────────────────────────

  fireMorningEma() {
    this.emaService.fireMorningEma();
  }

  fireContextEma() {
    this.emaService.fireContextAwareEma();
  }

  fireEveningEma() {
    this.emaService.fireEveningEma();
  }

  async submitEmaResponse(promptId: string, response: string) {
    await this.emaService.submitResponse(promptId, response);
    this.emaCountToday = this.emaService.getTotalEmasToday();
  }

  dismissEma() {
    this.emaService.dismissEma();
  }

  // ── Clear Data ───────────────────────────────────────

  async clearAllData() {
    await this.storage.clearAllData();
    this.totalReadings = 0;
    this.totalEma = 0;
    this.activityHistory = [];
    this.conversationHistory = [];
  }

  // ── Helpers ──────────────────────────────────────────

  getStatusColor(type: SensorType): string {
    const status = this.statuses.get(type);
    if (!status) return '#999';
    switch (status.state) {
      case SensorState.ACTIVE: return '#1D9E75';
      case SensorState.ERROR: return '#EF4444';
      case SensorState.PERMISSION_NEEDED: return '#E8A838';
      default: return '#999';
    }
  }

  getStatusLabel(type: SensorType): string {
    const status = this.statuses.get(type);
    if (!status) return 'Unknown';
    switch (status.state) {
      case SensorState.ACTIVE: return 'Active';
      case SensorState.ERROR: return status.errorMessage || 'Error';
      case SensorState.PERMISSION_NEEDED: return 'Permission Needed';
      default: return 'Inactive';
    }
  }

  getIsolationColor(): string {
    if (!this.isolation) return '#999';
    const score = this.isolation.isolationScore;
    if (score >= 0.7) return '#EF4444';
    if (score >= 0.4) return '#E8A838';
    return '#1D9E75';
  }

  getIsolationLabel(): string {
    if (!this.isolation) return 'Not Monitoring';
    const score = this.isolation.isolationScore;
    if (score >= 0.7) return 'High Isolation';
    if (score >= 0.4) return 'Moderate';
    return 'Low';
  }

  formatTime(timestamp: number | null): string {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ── Private ──────────────────────────────────────────

  private subscribeToStreams() {
    this.subs.push(
      this.sensorService.sensingActive$.subscribe(active => this.isSensing = active),

      this.sensorService.location$.subscribe(loc => this.location = loc),

      this.sensorService.activity$.subscribe(act => {
        this.activity = act;
        if (act) {
          this.activityHistory.push(act.accelerationMagnitude);
          if (this.activityHistory.length > 20) this.activityHistory.shift();
        }
      }),

      this.sensorService.conversation$.subscribe(conv => {
        this.conversation = conv;
        if (conv) {
          this.conversationHistory.push(conv.conversationCount);
          if (this.conversationHistory.length > 20) this.conversationHistory.shift();
        }
      }),

      this.sensorService.phoneUsage$.subscribe(pu => this.phoneUsage = pu),

      this.sensorService.sensorStatus$.subscribe(statuses => this.statuses = statuses),

      this.isolationDetector.isolationState$.subscribe(state => this.isolation = state),

      this.emaService.pendingEma$.subscribe(ema => this.pendingEma = ema),

      this.emaService.emaHistory$.subscribe(history => this.emaCountToday = history.length)
    );
  }

  private async loadStats() {
    const stats = await this.storage.getStorageStats();
    this.totalReadings = stats.totalReadings;
    this.totalEma = stats.totalEma;
  }
}
