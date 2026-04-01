import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { UserProfileRecord } from './models/UserProfileRecord';
import { MedicalRecordsRecord } from './models/MedicalRecordsRecord';
import { InterviewSessionRecord } from './models/InterviewSessionRecord';
import { migrations } from './migrations';
import { voxSchema } from './schema';

const adapter = new SQLiteAdapter({
  dbName: 'voxpatient',
  schema: voxSchema,
  migrations,
  jsi: true,
  onSetUpError: (error) => {
    if (__DEV__) {
      console.error('Failed to set up WatermelonDB', error instanceof Error ? error.message : String(error));
    }
  },
});

export const database = new Database({
  adapter,
  modelClasses: [UserProfileRecord, MedicalRecordsRecord, InterviewSessionRecord],
});
