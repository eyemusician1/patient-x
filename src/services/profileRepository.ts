import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Q } from '@nozbe/watermelondb';
import { database } from '../db/database';
import { UserProfileRecord } from '../db/models/UserProfileRecord';
import { DEFAULT_PROFILE, UserProfile } from '../types/profile';

type SyncState = 'pending' | 'synced';

const PROFILES_COLLECTION = 'user_profiles';
const REMOTE_PROFILE_FIELD = 'profile';
const REMOTE_UPDATED_AT_FIELD = 'updatedAt';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeProfile(value: unknown): UserProfile {
  if (!isObject(value)) {
    return DEFAULT_PROFILE;
  }

  return {
    ...DEFAULT_PROFILE,
    ...value,
    lifestyle: {
      ...DEFAULT_PROFILE.lifestyle,
      ...(isObject(value.lifestyle) ? value.lifestyle : {}),
    },
    medications: Array.isArray(value.medications) ? (value.medications as UserProfile['medications']) : [],
    allergies: Array.isArray(value.allergies) ? (value.allergies as string[]) : [],
    conditions: Array.isArray(value.conditions) ? (value.conditions as string[]) : [],
    familyHistory: Array.isArray(value.familyHistory) ? (value.familyHistory as string[]) : [],
  };
}

function getCurrentUserId(): string {
  return auth().currentUser?.uid ?? 'local-anonymous';
}

function profilesCollection() {
  return database.get<UserProfileRecord>('user_profiles');
}

async function getLocalRecord(userId: string): Promise<UserProfileRecord | null> {
  const records = await profilesCollection().query(Q.where('user_id', userId)).fetch();
  return records[0] ?? null;
}

async function upsertLocalRecord(
  userId: string,
  profile: UserProfile,
  syncStatus: SyncState,
  updatedAt = Date.now(),
  lastSyncedAt: number | null = null
): Promise<void> {
  const serialized = JSON.stringify(profile);
  const existing = await getLocalRecord(userId);

  await database.write(async () => {
    if (existing) {
      await existing.update((record) => {
        record.profileJson = serialized;
        record.updatedAt = updatedAt;
        record.localSyncStatus = syncStatus;
        record.lastSyncedAt = lastSyncedAt;
      });
      return;
    }

    await profilesCollection().create((record) => {
      record.userId = userId;
      record.profileJson = serialized;
      record.updatedAt = updatedAt;
      record.localSyncStatus = syncStatus;
      record.lastSyncedAt = lastSyncedAt;
    });
  });
}

export async function loadLocalProfile(userId = getCurrentUserId()): Promise<UserProfile | null> {
  const record = await getLocalRecord(userId);
  if (!record) {
    return null;
  }

  try {
    return normalizeProfile(JSON.parse(record.profileJson));
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveLocalProfile(profile: UserProfile, userId = getCurrentUserId()): Promise<void> {
  await upsertLocalRecord(userId, normalizeProfile(profile), 'pending');
}

export async function syncPendingProfileToCloud(userId = getCurrentUserId()): Promise<void> {
  if (userId === 'local-anonymous') {
    return;
  }

  const record = await getLocalRecord(userId);
  if (!record || record.localSyncStatus !== 'pending') {
    return;
  }

  const profile = normalizeProfile(JSON.parse(record.profileJson));
  const updatedAt = record.updatedAt || Date.now();

  await firestore().collection(PROFILES_COLLECTION).doc(userId).set(
    {
      [REMOTE_PROFILE_FIELD]: profile,
      [REMOTE_UPDATED_AT_FIELD]: updatedAt,
    },
    { merge: true }
  );

  await database.write(async () => {
    await record.update((row) => {
      row.localSyncStatus = 'synced';
      row.lastSyncedAt = Date.now();
    });
  });
}

export async function pullRemoteProfileToLocal(userId = getCurrentUserId()): Promise<UserProfile | null> {
  if (userId === 'local-anonymous') {
    return null;
  }

  const doc = await firestore().collection(PROFILES_COLLECTION).doc(userId).get();
  const data = doc.data();
  if (!data || !data[REMOTE_PROFILE_FIELD]) {
    return null;
  }

  const remoteProfile = normalizeProfile(data[REMOTE_PROFILE_FIELD]);
  const remoteUpdatedAt = Number(data[REMOTE_UPDATED_AT_FIELD] ?? 0);
  const local = await getLocalRecord(userId);

  if (local && local.updatedAt > remoteUpdatedAt) {
    return normalizeProfile(JSON.parse(local.profileJson));
  }

  await upsertLocalRecord(userId, remoteProfile, 'synced', remoteUpdatedAt || Date.now(), Date.now());
  return remoteProfile;
}

export async function syncProfileForCurrentUser(): Promise<void> {
  const userId = getCurrentUserId();
  if (userId === 'local-anonymous') {
    return;
  }

  await pullRemoteProfileToLocal(userId);
  await syncPendingProfileToCloud(userId);
}
