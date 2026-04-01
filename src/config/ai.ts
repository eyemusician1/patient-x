import { Platform } from 'react-native';

const DEFAULT_DEV_BACKEND_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8080',
  ios: 'http://localhost:8080',
  default: 'http://localhost:8080',
});

export const AI_CONFIG = {
  // Base URL for your backend API, for example: https://api.yourdomain.com
  // In development, default to a local backend server.
  backendBaseUrl: __DEV__ ? DEFAULT_DEV_BACKEND_BASE_URL ?? '' : '',
  // Endpoint that returns an interview reply payload: { text: string }
  backendInterviewPath: '/ai/interview-reply',
  // Backend can use this policy to route across free-tier models.
  modelRouting: {
    primary: 'gemini-2.5-flash',
    fallback: 'gemini-2.5-flash-lite',
    escalation: 'gemini-3.1-flash-lite',
    maxRetries: 1,
  },
  // Attach Firebase ID token when available.
  includeAuthToken: true,
  requestTimeoutMs: 12000,
};
