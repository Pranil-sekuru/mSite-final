import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
  SensorReading,
  SensorType,
  EmaResponse,
  SensingConfig,
  DEFAULT_SENSING_CONFIG,
  HomeGeofence
} from '../models/sensor.models';

@Injectable({ providedIn: 'root' })
export class DataStorageService {

  private readonly SENSOR_PREFIX = 'sensor_';
  private readonly EMA_KEY = 'ema_responses';
  private readonly CONFIG_KEY = 'sensing_config';
  private readonly HOME_KEY = 'home_location';

  // ── Sensor Readings ──────────────────────────────────

  async saveSensorReading(reading: SensorReading): Promise<void> {
    const dateKey = this.getDateKey(reading.timestamp);
    const key = `${this.SENSOR_PREFIX}${reading.sensorType}_${dateKey}`;

    const existing = await this.getArray<SensorReading>(key);
    existing.push(reading);

    // Keep max 1000 readings per sensor per day
    if (existing.length > 1000) {
      existing.splice(0, existing.length - 1000);
    }

    await Preferences.set({ key, value: JSON.stringify(existing) });
  }

  async saveSensorReadingsBatch(readings: SensorReading[]): Promise<void> {
    for (const reading of readings) {
      await this.saveSensorReading(reading);
    }
  }

  async getSensorHistory(
    type: SensorType,
    fromDate: Date,
    toDate: Date
  ): Promise<SensorReading[]> {
    const results: SensorReading[] = [];
    const current = new Date(fromDate);

    while (current <= toDate) {
      const dateKey = this.getDateKey(current.getTime());
      const key = `${this.SENSOR_PREFIX}${type}_${dateKey}`;
      const data = await this.getArray<SensorReading>(key);
      results.push(...data);
      current.setDate(current.getDate() + 1);
    }

    return results.sort((a, b) => a.timestamp - b.timestamp);
  }

  async getTodaySensorReadings(type: SensorType): Promise<SensorReading[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.getSensorHistory(type, today, new Date());
  }

  // ── EMA Responses ────────────────────────────────────

  async saveEmaResponse(response: EmaResponse): Promise<void> {
    const existing = await this.getArray<EmaResponse>(this.EMA_KEY);
    existing.push(response);
    await Preferences.set({ key: this.EMA_KEY, value: JSON.stringify(existing) });
  }

  async getEmaHistory(): Promise<EmaResponse[]> {
    return this.getArray<EmaResponse>(this.EMA_KEY);
  }

  async getTodayEmaResponses(): Promise<EmaResponse[]> {
    const all = await this.getEmaHistory();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return all.filter(r => r.responseTimestamp >= todayStart.getTime());
  }

  // ── Configuration ────────────────────────────────────

  async saveConfig(config: SensingConfig): Promise<void> {
    await Preferences.set({ key: this.CONFIG_KEY, value: JSON.stringify(config) });
  }

  async getConfig(): Promise<SensingConfig> {
    const { value } = await Preferences.get({ key: this.CONFIG_KEY });
    return value ? JSON.parse(value) : { ...DEFAULT_SENSING_CONFIG };
  }

  async saveHomeLocation(geofence: HomeGeofence): Promise<void> {
    await Preferences.set({ key: this.HOME_KEY, value: JSON.stringify(geofence) });
    const config = await this.getConfig();
    config.homeGeofence = geofence;
    await this.saveConfig(config);
  }

  async getHomeLocation(): Promise<HomeGeofence> {
    const config = await this.getConfig();
    return config.homeGeofence;
  }

  // ── Utilities ────────────────────────────────────────

  async clearAllData(): Promise<void> {
    await Preferences.clear();
  }

  async getStorageStats(): Promise<{ totalReadings: number; totalEma: number }> {
    const ema = await this.getEmaHistory();
    // Count today's sensor readings as a proxy
    let totalReadings = 0;
    for (const type of Object.values(SensorType)) {
      const readings = await this.getTodaySensorReadings(type);
      totalReadings += readings.length;
    }
    return { totalReadings, totalEma: ema.length };
  }

  // ── Private helpers ──────────────────────────────────

  private async getArray<T>(key: string): Promise<T[]> {
    const { value } = await Preferences.get({ key });
    if (!value) return [];
    try {
      return JSON.parse(value) as T[];
    } catch {
      return [];
    }
  }

  private getDateKey(timestamp: number): string {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
