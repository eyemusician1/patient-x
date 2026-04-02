import { supabase } from './supabaseClient';

export async function getPreferredAuthToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return null;
  }

  return data.session?.access_token ?? null;
}
