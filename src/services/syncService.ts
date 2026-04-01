import { syncProfileForCurrentUser } from './profileRepository';
import { syncMedicalRecordsForCurrentUser } from './recordsRepository';
import { syncInterviewSessionsForCurrentUser } from './interviewRepository';

export async function syncAllUserData(): Promise<void> {
  await Promise.allSettled([
    syncProfileForCurrentUser(),
    syncMedicalRecordsForCurrentUser(),
    syncInterviewSessionsForCurrentUser(),
  ]);
}
