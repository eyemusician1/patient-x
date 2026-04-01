import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PROFILE, UserProfile } from '../types/profile';
import {
  loadLocalProfile,
  normalizeProfile,
  saveLocalProfile,
  syncPendingProfileToCloud,
} from './profileRepository';

const PROFILE_STORAGE_KEY = 'userProfile';
export const ONBOARDING_STORAGE_KEY = 'hasOnboarded';

async function migrateLegacyProfileToLocal(): Promise<UserProfile | null> {
  const legacyRaw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
  if (!legacyRaw) {
    return null;
  }

  try {
    const parsed = normalizeProfile(JSON.parse(legacyRaw));
    await saveLocalProfile(parsed);
    await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
    return parsed;
  } catch {
    await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
    return null;
  }
}

export async function loadUserProfile(): Promise<UserProfile> {
  try {
    const local = await loadLocalProfile();
    if (local) {
      return local;
    }
  } catch {
    // If local DB is unavailable, continue with AsyncStorage fallback.
  }

  try {
    const migrated = await migrateLegacyProfileToLocal();
    if (migrated) {
      return migrated;
    }

    const legacyRaw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    if (!legacyRaw) {
      return DEFAULT_PROFILE;
    }

    return normalizeProfile(JSON.parse(legacyRaw));
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const normalized = normalizeProfile(profile);

  try {
    await saveLocalProfile(normalized);
    await syncPendingProfileToCloud();
    await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
    return;
  } catch {
    // Fall back to AsyncStorage if WatermelonDB or Firestore is unavailable.
  }

  await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized));
}