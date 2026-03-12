import { Component } from '@angular/core';

interface LayerComponent {
  name: string;
  description: string;
  icon: string;
}

interface Layer {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  description: string;
  components: LayerComponent[];
}

@Component({
  selector: 'app-how-it-works',
  templateUrl: './how-it-works.page.html',
  styleUrls: ['./how-it-works.page.scss'],
  standalone: false,
})
export class HowItWorksPage {
  selectedLayer = 'sensing';

  layers: Layer[] = [
    {
      id: 'sensing',
      title: 'Mobile Sensing',
      subtitle: 'Layer 1',
      icon: 'wifi-outline',
      color: '#3B8BD4',
      description: 'Passive data collection running continuously on an Android phone, detecting social context without user input.',
      components: [
        { name: 'Conversation Sensor', description: 'Microphone-based detection of ambient speech — detects conversations without recording content', icon: 'mic-outline' },
        { name: 'Location Sensor', description: 'GPS and geofencing to detect whether user is at home or elsewhere', icon: 'location-outline' },
        { name: 'Activity Sensor', description: 'Accelerometer and step counter for physical movement tracking', icon: 'walk-outline' },
        { name: 'Phone Usage Sensor', description: 'Screen-on events, call logs, and app usage patterns', icon: 'phone-portrait-outline' },
      ]
    },
    {
      id: 'trigger',
      title: 'Context-Aware Trigger Engine',
      subtitle: 'Layer 2',
      icon: 'flash-outline',
      color: '#E8A838',
      description: 'Rule-based and ML logic that interprets sensor data and decides when to fire an intervention.',
      components: [
        { name: 'Isolation Detector', description: 'Triggers when user is detected as away from home AND alone (low conversation count)', icon: 'alert-circle-outline' },
        { name: 'EMA Scheduler', description: 'Manages up to 3 EMAs per day — morning action plan + 2 context-aware prompts', icon: 'calendar-outline' },
        { name: '46% Context-Aware', description: '46% of all EMAs served were triggered by sensor data, not by schedule', icon: 'analytics-outline' },
      ]
    },
    {
      id: 'cbt',
      title: 'CBT Intervention',
      subtitle: 'Layer 3',
      icon: 'chatbubbles-outline',
      color: '#1D9E75',
      description: 'Mobile delivery of cognitive-behavioral therapy techniques through structured EMA flows.',
      components: [
        { name: 'Belief Appraisal', description: 'Questions identifying defeatist beliefs (e.g. "I would fail") or threat beliefs (social anxiety)', icon: 'help-circle-outline' },
        { name: 'Belief Challenging', description: 'Personalized therapist messages counter defeatist thinking patterns', icon: 'shield-checkmark-outline' },
        { name: 'Savoring Prompt', description: 'Reinforces positive social interactions already completed', icon: 'happy-outline' },
        { name: 'Goal & Action Plan', description: 'Morning prompt to set short-term social steps toward long-term goals', icon: 'flag-outline' },
      ]
    },
    {
      id: 'therapist',
      title: 'Therapist-in-the-Loop',
      subtitle: 'Layer 4',
      icon: 'person-outline',
      color: '#8B5CF6',
      description: 'Clinicians personalize interventions and monitor participant progress through a dashboard.',
      components: [
        { name: 'Personalized Messages', description: 'Therapists input personalized challenge messages during in-person sessions', icon: 'create-outline' },
        { name: 'Remote Coaching', description: 'Video/phone sessions supplement in-person therapy during weeks 5–8', icon: 'videocam-outline' },
        { name: 'Progress Dashboard', description: 'Displays weekly sensing trends: conversation count, time at home', icon: 'stats-chart-outline' },
      ]
    },
    {
      id: 'data',
      title: 'Data Pipeline & Privacy',
      subtitle: 'Layer 5',
      icon: 'lock-closed-outline',
      color: '#EF4444',
      description: 'All sensing data is anonymized and stored securely. Privacy-first design ensures participant protection.',
      components: [
        { name: 'Anonymized Storage', description: 'All sensing data is anonymized and stored securely', icon: 'cloud-outline' },
        { name: 'No Audio Recording', description: 'No audio content is ever recorded — only presence/absence of speech detected', icon: 'mic-off-outline' },
        { name: 'Outcome Metrics', description: 'Social functioning scale, negative symptom severity, EMA response rate', icon: 'trending-up-outline' },
        { name: '77% Adherence', description: '77% average EMA adherence rate across all participants', icon: 'checkmark-circle-outline' },
      ]
    },
  ];

  get currentLayer(): Layer {
    return this.layers.find(l => l.id === this.selectedLayer) || this.layers[0];
  }

  selectLayer(id: string) {
    this.selectedLayer = id;
  }
}
