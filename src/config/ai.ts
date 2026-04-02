import { Platform } from 'react-native';

const DEFAULT_DEV_BACKEND_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8080',
  ios: 'http://localhost:8080',
  default: 'http://localhost:8080',
});

// Replace with your Supabase Functions base URL, e.g. https://<project-ref>.functions.supabase.co
const SUPABASE_FUNCTIONS_BASE_URL = 'https://ixrheeifgtygmiucohcx.functions.supabase.co';
const USE_LOCAL_DEV_BACKEND = false;

export const AI_CONFIG = {
  // Use Supabase Functions by default in both dev and release.
  // Flip USE_LOCAL_DEV_BACKEND to true only if you intentionally want local backend in debug.
  backendBaseUrl:
    __DEV__ && USE_LOCAL_DEV_BACKEND
      ? DEFAULT_DEV_BACKEND_BASE_URL ?? ''
      : SUPABASE_FUNCTIONS_BASE_URL,
  // For Supabase Edge Functions, this should match your function name.
  // Full URL example: https://<project-ref>.functions.supabase.co/ai-interview-reply
  backendInterviewPath: '/ai-interview-reply',
  // Backend can use this policy to route across free-tier models.
  modelRouting: {
    primary: 'gemini-2.5-flash',
    fallback: 'gemini-2.5-flash',
    escalation: 'gemini-2.5-flash',
    maxRetries: 1,
  },
  // Attach Supabase auth token when available.
  includeAuthToken: true,
  // Raised from 12000 to 20000 to avoid cutting off responses on slow connections.
  requestTimeoutMs: 20000,
};