import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class MedicalRecordsRecord extends Model {
  static table = 'medical_records';

  @field('user_id') userId!: string;
  @field('records_json') recordsJson!: string;
  @field('updated_at') updatedAt!: number;
  @field('sync_status') localSyncStatus!: string;
  @field('last_synced_at') lastSyncedAt!: number | null;
}
