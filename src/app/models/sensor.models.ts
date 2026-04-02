/**
 * mSITE Sensor Data Models
 * Interfaces and enums for mobile sensing pipeline
 */

export enum SensorType {
  LOCATION = 'location',
  ACTIVITY = 'activity',
  CONVERSATION = 'conversation',
  PHONE_USAGE = 'phone_usage'
}

export enum SensorState {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  ERROR = 'error',
  PERMISSION_NEEDED = 'permission_needed'
}

export interface SensorReading {
  id: string;
  timestamp: number;
  sensorType: SensorType;
}

export interface LocationReading extends SensorReading {
  sensorType: SensorType.LOCATION;
  latitude: number;
  longitude: number;
  accuracy: number;
  isAtHome: boolean;
}

export interface ActivityReading extends SensorReading {
  sensorType: SensorType.ACTIVITY;
  steps: number;
  isMoving: boolean;
  intensity: 'sedentary' | 'light' | 'moderate' | 'vigorous';
  accelerationMagnitude: number;
  // Sliding-window gait classifier outputs
  gaitActivity: 'sedentary' | 'walking' | 'running';
  windowVariance: number;
  peakCount: number;
}

export interface ConversationReading extends SensorReading {
  sensorType: SensorType.CONVERSATION;
  conversationDetected: boolean;
  conversationCount: number;
  estimatedDurationMinutes: number;
  // HMM/Viterbi decoder outputs
  hmmState: 'silence' | 'speech' | 'conversation';
  audioEnergyLevel: number;   // RMS energy 0–1
  confidence: number;          // Viterbi max-probability (log-scale)
}

export interface PhoneUsageReading extends SensorReading {
  sensorType: SensorType.PHONE_USAGE;
  screenOn: boolean;
  callActive: boolean;
  appUsageMinutes: number;
}

export interface IsolationState {
  isAlone: boolean;
  isHome: boolean;
  lastConversationMinutesAgo: number;
  conversationCountToday: number;
  isolationScore: number; // 0 (not isolated) to 1 (highly isolated)
  timestamp: number;
  triggerEma: boolean;
  currentHmmState: 'silence' | 'speech' | 'conversation';
}

export interface SensorStatus {
  sensorType: SensorType;
  state: SensorState;
  lastReading: number | null; // timestamp
  errorMessage?: string;
}

export interface EmaPrompt {
  id: string;
  type: 'morning_goal' | 'context_aware' | 'evening_reflection';
  title: string;
  question: string;
  responseOptions: string[];
  triggerSource: 'scheduled' | 'sensor_triggered';
  timestamp: number;
  isolationState?: IsolationState;
}

export interface EmaResponse {
  promptId: string;
  type: EmaPrompt['type'];
  response: string;
  responseTimestamp: number;
  reactionTimeMs: number;
}

export interface HomeGeofence {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface SensingConfig {
  homeGeofence: HomeGeofence;
  locationIntervalMs: number;
  activityIntervalMs: number;
  conversationIntervalMs: number;
  phoneUsageIntervalMs: number;
  isolationConversationThreshold: number;
  isolationDurationMinutes: number;
}

export const DEFAULT_SENSING_CONFIG: SensingConfig = {
  homeGeofence: {
    latitude: 0,
    longitude: 0,
    radiusMeters: 100
  },
  locationIntervalMs: 30000,       // 30 seconds
  activityIntervalMs: 10000,       // 10 seconds
  conversationIntervalMs: 60000,   // 1 minute
  phoneUsageIntervalMs: 60000,     // 1 minute
  isolationConversationThreshold: 2,
  isolationDurationMinutes: 30
};
