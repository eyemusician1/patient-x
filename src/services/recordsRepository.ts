import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Q } from '@nozbe/watermelondb';
import { database } from '../db/database';
import { MedicalRecordsRecord } from '../db/models/MedicalRecordsRecord';
import { DEFAULT_MEDICAL_RECORDS, MedicalRecordsData, MedicineRecord } from '../types/records';

type SyncState = 'pending' | 'synced';

const RECORDS_COLLECTION = 'user_records';
const REMOTE_RECORDS_FIELD = 'records';
const REMOTE_UPDATED_AT_FIELD = 'updatedAt';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeMedicines(value: unknown): MedicineRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => isObject(item))
    .map((item) => ({
      id: String(item.id ?? Date.now().toString()),
      name: String(item.name ?? '').trim(),
      dosage: String(item.dosage ?? '').trim(),
      frequency: String(item.frequency ?? '').trim(),
    }))
    .filter((item) => item.name.length > 0);
}

export function normalizeMedicalRecords(value: unknown): MedicalRecordsData {
  if (!isObject(value)) {
    return DEFAULT_MEDICAL_RECORDS;
  }

  return {
    medicines: normalizeMedicines(value.medicines),
    allergies: Array.isArray(value.allergies)
      ? value.allergies.map((entry) => String(entry).trim()).filter(Boolean)
      : [],
    conditionsNote: String(value.conditionsNote ?? ''),
  };
}

function getCurrentUserId(): string {
  return auth().currentUser?.uid ?? 'local-anonymous';
}

function recordsCollection() {
  return database.get<MedicalRecordsRecord>('medical_records');
}

async function getLocalRecord(userId: string): Promise<MedicalRecordsRecord | null> {
  const records = await recordsCollection().query(Q.where('user_id', userId)).fetch();
  return records[0] ?? null;
}

async function upsertLocalRecord(
  userId: string,
  records: MedicalRecordsData,
  syncStatus: SyncState,
  updatedAt = Date.now(),
  lastSyncedAt: number | null = null
): Promise<void> {
  const serialized = JSON.stringify(records);
  const existing = await getLocalRecord(userId);

  await database.write(async () => {
    if (existing) {
      await existing.update((record) => {
        record.recordsJson = serialized;
        record.updatedAt = updatedAt;
        record.localSyncStatus = syncStatus;
        record.lastSyncedAt = lastSyncedAt;
      });
      return;
    }

    await recordsCollection().create((record) => {
      record.userId = userId;
      record.recordsJson = serialized;
      record.updatedAt = updatedAt;
      record.localSyncStatus = syncStatus;
      record.lastSyncedAt = lastSyncedAt;
    });
  });
}

export async function loadLocalMedicalRecords(userId = getCurrentUserId()): Promise<MedicalRecordsData | null> {
  const record = await getLocalRecord(userId);
  if (!record) {
    return null;
  }

  try {
    return normalizeMedicalRecords(JSON.parse(record.recordsJson));
  } catch {
    return DEFAULT_MEDICAL_RECORDS;
  }
}

export async function saveLocalMedicalRecords(records: MedicalRecordsData, userId = getCurrentUserId()): Promise<void> {
  await upsertLocalRecord(userId, normalizeMedicalRecords(records), 'pending');
}

export async function syncPendingMedicalRecordsToCloud(userId = getCurrentUserId()): Promise<void> {
  if (userId === 'local-anonymous') {
    return;
  }

  const record = await getLocalRecord(userId);
  if (!record || record.localSyncStatus !== 'pending') {
    return;
  }

  const records = normalizeMedicalRecords(JSON.parse(record.recordsJson));
  const updatedAt = record.updatedAt || Date.now();

  await firestore().collection(RECORDS_COLLECTION).doc(userId).set(
    {
      [REMOTE_RECORDS_FIELD]: records,
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

export async function pullRemoteMedicalRecordsToLocal(userId = getCurrentUserId()): Promise<MedicalRecordsData | null> {
  if (userId === 'local-anonymous') {
    return null;
  }

  const doc = await firestore().collection(RECORDS_COLLECTION).doc(userId).get();
  const data = doc.data();
  if (!data || !data[REMOTE_RECORDS_FIELD]) {
    return null;
  }

  const remoteRecords = normalizeMedicalRecords(data[REMOTE_RECORDS_FIELD]);
  const remoteUpdatedAt = Number(data[REMOTE_UPDATED_AT_FIELD] ?? 0);
  const local = await getLocalRecord(userId);

  if (local && local.updatedAt > remoteUpdatedAt) {
    return normalizeMedicalRecords(JSON.parse(local.recordsJson));
  }

  await upsertLocalRecord(userId, remoteRecords, 'synced', remoteUpdatedAt || Date.now(), Date.now());
  return remoteRecords;
}

export async function syncMedicalRecordsForCurrentUser(): Promise<void> {
  const userId = getCurrentUserId();
  if (userId === 'local-anonymous') {
    return;
  }

  await pullRemoteMedicalRecordsToLocal(userId);
  await syncPendingMedicalRecordsToCloud(userId);
}
