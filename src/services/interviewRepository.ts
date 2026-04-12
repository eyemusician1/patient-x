import { Q } from '@nozbe/watermelondb';
import { database } from '../db/database';
import { InterviewSessionRecord } from '../db/models/InterviewSessionRecord';
import { AuthService } from './authService';
import { INITIAL_INTERVIEW_PROMPT, InterviewMessage, InterviewSession } from '../types/interview';
import { supabase } from './supabaseClient'; // adjust if your path differs

type SyncState = 'pending' | 'synced';

const INTERVIEW_TABLE = 'user_interview_sessions';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeMessage(value: unknown): InterviewMessage | null {
  if (!isObject(value)) {
    return null;
  }

  const role = value.role === 'assistant' ? 'assistant' : value.role === 'user' ? 'user' : null;
  const text = String(value.text ?? '').trim();
  if (!role || !text) {
    return null;
  }

  return {
    id: String(value.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    role,
    text,
    createdAt: Number(value.createdAt ?? Date.now()),
  };
}

export function normalizeInterviewSession(value: unknown): InterviewSession | null {
  if (!isObject(value)) {
    return null;
  }

  const sessionId = String(value.sessionId ?? '').trim();
  if (!sessionId) {
    return null;
  }

  const rawMessages = Array.isArray(value.messages) ? value.messages : [];
  const messages = rawMessages
    .map((message) => normalizeMessage(message))
    .filter((message): message is InterviewMessage => Boolean(message));

  const createdAt = Number(value.createdAt ?? Date.now());
  const updatedAt = Number(value.updatedAt ?? createdAt);

  return {
    sessionId,
    messages,
    createdAt,
    updatedAt,
  };
}

function getCurrentUserId(): string {
  return AuthService.getCurrentUserId() ?? 'local-anonymous';
}

function sessionsCollection() {
  return database.get<InterviewSessionRecord>('interview_sessions');
}

function parseSessionJson(value: string): InterviewSession | null {
  try {
    return normalizeInterviewSession(JSON.parse(value));
  } catch {
    return null;
  }
}

async function getSessionRecord(userId: string, sessionId: string): Promise<InterviewSessionRecord | null> {
  const records = await sessionsCollection()
    .query(Q.where('user_id', userId), Q.where('session_id', sessionId))
    .fetch();
  return records[0] ?? null;
}

async function upsertSessionRecord(
  userId: string,
  session: InterviewSession,
  syncStatus: SyncState,
  updatedAt = Date.now(),
  lastSyncedAt: number | null = null
): Promise<void> {
  const existing = await getSessionRecord(userId, session.sessionId);
  const serialized = JSON.stringify({ ...session, updatedAt });

  await database.write(async () => {
    if (existing) {
      await existing.update((record) => {
        record.sessionJson = serialized;
        record.updatedAt = updatedAt;
        record.localSyncStatus = syncStatus;
        record.lastSyncedAt = lastSyncedAt;
      });
      return;
    }

    await sessionsCollection().create((record) => {
      record.userId = userId;
      record.sessionId = session.sessionId;
      record.sessionJson = serialized;
      record.updatedAt = updatedAt;
      record.localSyncStatus = syncStatus;
      record.lastSyncedAt = lastSyncedAt;
    });
  });
}

export function createInterviewSessionId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function createDefaultInterviewSession(sessionId = createInterviewSessionId()): InterviewSession {
  const now = Date.now();
  return {
    sessionId,
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: `assistant-${now}`,
        role: 'assistant',
        text: INITIAL_INTERVIEW_PROMPT,
        createdAt: now,
      },
    ],
  };
}

export async function loadLocalInterviewSession(sessionId: string, userId = getCurrentUserId()): Promise<InterviewSession | null> {
  const record = await getSessionRecord(userId, sessionId);
  if (!record) {
    return null;
  }

  return parseSessionJson(record.sessionJson);
}

export async function loadLocalInterviewSessions(userId = getCurrentUserId()): Promise<InterviewSession[]> {
  const rows = await sessionsCollection()
    .query(Q.where('user_id', userId), Q.sortBy('updated_at', Q.desc))
    .fetch();

  return rows
    .map((row) => parseSessionJson(row.sessionJson))
    .filter((session): session is InterviewSession => Boolean(session));
}

export async function loadMostRecentLocalInterviewSession(userId = getCurrentUserId()): Promise<InterviewSession | null> {
  const sessions = await loadLocalInterviewSessions(userId);
  return sessions[0] ?? null;
}

export async function saveLocalInterviewSession(session: InterviewSession, userId = getCurrentUserId()): Promise<void> {
  const normalized = normalizeInterviewSession(session);
  if (!normalized) {
    return;
  }

  const updatedAt = Date.now();
  await upsertSessionRecord(userId, { ...normalized, updatedAt }, 'pending', updatedAt);
}

export async function syncPendingInterviewSessionsToCloud(userId = getCurrentUserId()): Promise<void> {
  if (userId === 'local-anonymous') {
    return;
  }

  const pending = await sessionsCollection()
    .query(Q.where('user_id', userId), Q.where('sync_status', 'pending'))
    .fetch();

  for (const row of pending) {
    const parsed = normalizeInterviewSession(JSON.parse(row.sessionJson));
    if (!parsed) {
      continue;
    }

    const updatedAt = row.updatedAt || Date.now();

    const { error } = await supabase
      .from(INTERVIEW_TABLE)
      .upsert(
        {
          doc_id: `${userId}_${parsed.sessionId}`,
          user_id: userId,
          session_id: parsed.sessionId,
          session: parsed,
          updated_at: updatedAt,
        },
        { onConflict: 'doc_id' }
      );

    if (error) {
      throw new Error(`Failed to sync interview session to Supabase: ${error.message}`);
    }

    await database.write(async () => {
      await row.update((record) => {
        record.localSyncStatus = 'synced';
        record.lastSyncedAt = Date.now();
      });
    });
  }
}

export async function pullRemoteInterviewSessionsToLocal(userId = getCurrentUserId()): Promise<void> {
  if (userId === 'local-anonymous') {
    return;
  }

  const { data, error } = await supabase
    .from(INTERVIEW_TABLE)
    .select('session, updated_at')
    .eq('user_id', userId);

  if (error || !data) {
    return;
  }

  for (const row of data) {
    const remoteSession = normalizeInterviewSession(row.session);
    if (!remoteSession) {
      continue;
    }

    const remoteUpdatedAt = Number(row.updated_at ?? 0);
    const local = await getSessionRecord(userId, remoteSession.sessionId);

    if (local && local.updatedAt > remoteUpdatedAt) {
      continue;
    }

    await upsertSessionRecord(
      userId,
      { ...remoteSession, updatedAt: remoteUpdatedAt || Date.now() },
      'synced',
      remoteUpdatedAt || Date.now(),
      Date.now()
    );
  }
}

export async function syncInterviewSessionsForCurrentUser(): Promise<void> {
  const userId = getCurrentUserId();
  if (userId === 'local-anonymous') {
    return;
  }

  await pullRemoteInterviewSessionsToLocal(userId);
  await syncPendingInterviewSessionsToCloud(userId);
}