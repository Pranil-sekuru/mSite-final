import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.msite.mobilesensing',
  appName: 'mSITE',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  ios: {
    contentInset: 'automatic'
  },
  plugins: {
    Geolocation: {
      // Request fine location for accurate geofencing
    },
    Motion: {
      // Accelerometer access
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: false
    }
  }
};

export default config;
