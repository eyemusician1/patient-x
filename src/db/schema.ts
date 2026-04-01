import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const voxSchema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'user_profiles',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'profile_json', type: 'string' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'medical_records',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'records_json', type: 'string' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'interview_sessions',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'session_id', type: 'string', isIndexed: true },
        { name: 'session_json', type: 'string' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),
  ],
});
