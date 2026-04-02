import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { User } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/supabase';
import { supabase } from './supabaseClient';

// Configure Google Sign-In right away
GoogleSignin.configure({
  webClientId: SUPABASE_CONFIG.googleWebClientId,
});

export type AppUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

let currentUserCache: AppUser | null = null;

function logAuthError(message: string, error: unknown) {
  if (!__DEV__) {
    return;
  }

  const safeMessage = error instanceof Error ? error.message : String(error);
  const details =
    typeof error === 'object' && error !== null
      ? JSON.stringify(error, Object.getOwnPropertyNames(error as object))
      : safeMessage;

  console.error(message, safeMessage, details);
}

export const AuthService = {
  mapUser: (user: User | null): AppUser | null => {
    if (!user) {
      return null;
    }

    const metadata = user.user_metadata as Record<string, unknown> | null;
    const fullName =
      (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
      (typeof metadata?.name === 'string' && metadata.name.trim()) ||
      null;

    return {
      id: user.id,
      email: user.email ?? null,
      displayName: fullName,
    };
  },

  getCurrentUser: (): AppUser | null => {
    return currentUserCache;
  },

  getCurrentUserId: (): string | null => {
    return currentUserCache?.id ?? null;
  },

  signInWithGoogle: async () => {
    try {
      // 1. Check if your device has Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // 2. Get the user's ID token from Google
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token found');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('AuthRetryableFetchError') || message.includes('status":0') || message.includes('status: 0')) {
        throw new Error('Supabase auth request failed (network/status 0). Check internet on device/emulator and verify Google Client IDs in Supabase Auth provider.');
      }

      logAuthError('Google Sign-In failed', error);
      throw error;
    }
  },

  signOut: async () => {
    try {
      // Sign out of both Supabase and Google locally.
      await Promise.all([
        supabase.auth.signOut(),
        GoogleSignin.revokeAccess(),
        GoogleSignin.signOut(),
      ]);
    } catch (error) {
      logAuthError('Sign out failed', error);
      throw error;
    }
  },

  getCurrentSessionUser: async (): Promise<AppUser | null> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      currentUserCache = null;
      return null;
    }

    const mapped = AuthService.mapUser(data.session?.user ?? null);
    currentUserCache = mapped;
    return mapped;
  },

  onAuthStateChange: (callback: (user: AppUser | null) => void) => {
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          currentUserCache = null;
          callback(null);
          return;
        }

        const mapped = AuthService.mapUser(data.session?.user ?? null);
        currentUserCache = mapped;
        callback(mapped);
      })
      .catch(() => {
        currentUserCache = null;
        callback(null);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const mapped = AuthService.mapUser(session?.user ?? null);
      currentUserCache = mapped;
      callback(mapped);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  },
};