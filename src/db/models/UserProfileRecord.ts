import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class UserProfileRecord extends Model {
  static table = 'user_profiles';

  @field('user_id') userId!: string;
  @field('profile_json') profileJson!: string;
  @field('updated_at') updatedAt!: number;
  @field('sync_status') localSyncStatus!: string;
  @field('last_synced_at') lastSyncedAt!: number | null;
}
