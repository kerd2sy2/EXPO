import * as Clarity from '@microsoft/react-native-clarity';
import { Mixpanel } from 'mixpanel-react-native';
import { Platform } from 'react-native';

const CLARITY_PROJECT_ID = 'yr4p5ky7t4';
const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || '5f7b23548d1b';
// EU data residency endpoint for Mixpanel projects hosted in EU
const MIXPANEL_EU_SERVER_URL = 'https://api-eu.mixpanel.com';

let isClarityInitialized = false;
let mixpanelInstance: Mixpanel | null = null;

export const analytics = {
  /**
   * Initialize Analytics (Microsoft Clarity & Mixpanel EU)
   */
  init: async () => {
    // 1. Initialize Microsoft Clarity
    if (!isClarityInitialized) {
      try {
        Clarity.initialize(CLARITY_PROJECT_ID, {
          logLevel: __DEV__ ? Clarity.LogLevel.Verbose : Clarity.LogLevel.None,
        });
        isClarityInitialized = true;
        console.log(`[Analytics] Microsoft Clarity initialized successfully (Project ID: ${CLARITY_PROJECT_ID})`);
      } catch (err) {
        console.warn('[Analytics] Microsoft Clarity initialization notice:', err);
      }
    }

    // 2. Initialize Mixpanel with EU Server Endpoint
    if (!mixpanelInstance && MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'YOUR_MIXPANEL_TOKEN') {
      try {
        mixpanelInstance = new Mixpanel(MIXPANEL_TOKEN, true);
        mixpanelInstance.setServerURL(MIXPANEL_EU_SERVER_URL);
        mixpanelInstance.setLoggingEnabled(__DEV__);
        await mixpanelInstance.init(false, undefined, MIXPANEL_EU_SERVER_URL);
        
        // Track initial app launch event & flush immediately so Mixpanel dashboard connects
        mixpanelInstance.track('App Launched', {
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
          app: 'AAMS Delegate',
        });
        mixpanelInstance.flush();

        console.log(`[Analytics] Mixpanel initialized with EU server (${MIXPANEL_EU_SERVER_URL})`);
      } catch (mixErr) {
        console.warn('[Analytics] Mixpanel initialization notice:', mixErr);
      }
    }
  },

  /**
   * Configure/Update Mixpanel Token dynamically
   */
  setMixpanelToken: async (token: string) => {
    if (!token || token === 'YOUR_MIXPANEL_TOKEN') return;
    try {
      mixpanelInstance = new Mixpanel(token, true);
      mixpanelInstance.setServerURL(MIXPANEL_EU_SERVER_URL);
      mixpanelInstance.setLoggingEnabled(__DEV__);
      await mixpanelInstance.init(false, undefined, MIXPANEL_EU_SERVER_URL);
      mixpanelInstance.flush();
      console.log('[Analytics] Mixpanel token set and initialized with EU endpoint successfully');
    } catch (e) {
      console.warn('[Analytics] Mixpanel setToken notice:', e);
    }
  },

  /**
   * Identify current delegate user across Clarity & Mixpanel
   */
  identify: (userId: string, tags?: Record<string, any>) => {
    try {
      if (userId) {
        Clarity.setCustomUserId(userId);
        if (mixpanelInstance) {
          mixpanelInstance.identify(userId);
          if (tags) {
            mixpanelInstance.getPeople().set(tags);
          }
          mixpanelInstance.flush();
        }
      }
      if (tags) {
        Object.entries(tags).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            Clarity.setCustomTag(key, String(val));
          }
        });
      }
    } catch (e) {
      console.warn('[Analytics] Clarity/Mixpanel identify notice:', e);
    }
  },

  /**
   * Track custom actions and events across Clarity & Mixpanel
   */
  trackEvent: (eventName: string, properties?: Record<string, any>) => {
    try {
      Clarity.setCustomTag('last_event', eventName);
      if (properties) {
        Object.entries(properties).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            Clarity.setCustomTag(`${eventName}_${k}`, String(v));
          }
        });
      }
      if (mixpanelInstance) {
        mixpanelInstance.track(eventName, properties);
        mixpanelInstance.flush();
      }
    } catch (e) {
      console.warn('[Analytics] Clarity/Mixpanel track event notice:', e);
    }
  },

  /**
   * Time an event to measure duration (e.g., shift duration, plate scan time)
   */
  timeEvent: (eventName: string) => {
    try {
      if (mixpanelInstance) {
        mixpanelInstance.timeEvent(eventName);
      }
    } catch (e) {
      console.warn('[Analytics] Mixpanel timeEvent notice:', e);
    }
  },

  /**
   * Set active screen name for heatmaps and navigation funnel analysis
   */
  setScreen: (screenName: string) => {
    try {
      Clarity.setCurrentScreenName(screenName);
      if (mixpanelInstance) {
        mixpanelInstance.track('Screen View', { screen_name: screenName });
        mixpanelInstance.flush();
      }
    } catch (e) {
      console.warn('[Analytics] Clarity/Mixpanel set screen notice:', e);
    }
  },

  /**
   * Force flush queued events to servers
   */
  flush: () => {
    try {
      if (mixpanelInstance) {
        mixpanelInstance.flush();
      }
    } catch (e) {
      console.warn('[Analytics] Mixpanel flush notice:', e);
    }
  },

  /**
   * Reset state upon user logout
   */
  reset: () => {
    try {
      if (mixpanelInstance) {
        mixpanelInstance.reset();
      }
    } catch (e) {
      console.warn('[Analytics] Mixpanel reset notice:', e);
    }
  },
};

