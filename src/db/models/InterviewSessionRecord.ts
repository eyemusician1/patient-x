import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class InterviewSessionRecord extends Model {
  static table = 'interview_sessions';

  @field('user_id') userId!: string;
  @field('session_id') sessionId!: string;
  @field('session_json') sessionJson!: string;
  @field('updated_at') updatedAt!: number;
  @field('sync_status') localSyncStatus!: string;
  @field('last_synced_at') lastSyncedAt!: number | null;
}
