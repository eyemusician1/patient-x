import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'medical_records',
          columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'records_json', type: 'string' },
            { name: 'updated_at', type: 'number' },
            { name: 'sync_status', type: 'string' },
            { name: 'last_synced_at', type: 'number', isOptional: true },
          ],
        }),
        createTable({
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
    },
  ],
});
