import type { PostgrestError } from '@supabase/supabase-js';

import { isCropId, type CropId } from '@/constants/crops';
import { isGrowerType, type GrowerType } from '@/constants/growerTypes';
import { isLanguageCode, type LanguageCode } from '@/constants/languages';
import type { Coordinates } from '@/context/PreferencesContext';
import { supabase } from '@/lib/supabase';

export type AccountSetup = {
  language: LanguageCode | null;
  location: Coordinates | null;
  crops: CropId[];
  growerType: GrowerType | null;
};

type ProfileFields = Partial<Pick<AccountSetup, 'language' | 'location' | 'growerType'>>;

function toCoordinate(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Reads what this account has saved. Returns null when it could not be read. */
export async function loadAccountSetup(userId: string): Promise<AccountSetup | null> {
  const [profile, crops] = await Promise.all([
    supabase
      .from('profiles')
      .select('language, latitude, longitude, grower_type')
      .eq('id', userId)
      .maybeSingle(),
    supabase.from('user_crops').select('crop_id').eq('user_id', userId),
  ]);

  if (profile.error || crops.error) {
    console.warn('Could not read account setup:', (profile.error ?? crops.error)?.message);
    return null;
  }

  const latitude = toCoordinate(profile.data?.latitude);
  const longitude = toCoordinate(profile.data?.longitude);
  const language = profile.data?.language;
  const growerType = profile.data?.grower_type;

  return {
    language: typeof language === 'string' && isLanguageCode(language) ? language : null,
    location: latitude !== null && longitude !== null ? { latitude, longitude } : null,
    crops: (crops.data ?? [])
      .map((row) => row.crop_id)
      .filter((id): id is CropId => typeof id === 'string' && isCropId(id)),
    growerType: isGrowerType(growerType) ? growerType : null,
  };
}

/**
 * Updates only the fields passed in, leaving the rest of the profile untouched.
 * Errors are returned rather than thrown: a failed save must not lock anyone out.
 */
export async function saveAccountProfile(
  userId: string,
  fields: ProfileFields,
): Promise<PostgrestError | null> {
  const row: Record<string, unknown> = { id: userId, updated_at: new Date().toISOString() };
  if ('language' in fields) row.language = fields.language;
  if ('location' in fields) {
    row.latitude = fields.location?.latitude ?? null;
    row.longitude = fields.location?.longitude ?? null;
  }
  if ('growerType' in fields) row.grower_type = fields.growerType;

  const { error } = await supabase.from('profiles').upsert(row);
  return error;
}

/** Makes the account's crop list match `crops` exactly. */
export async function saveAccountCrops(
  userId: string,
  crops: CropId[],
): Promise<PostgrestError | null> {
  const removeOutdated = supabase.from('user_crops').delete().eq('user_id', userId);
  const { error: deleteError } = await (crops.length
    ? removeOutdated.not('crop_id', 'in', `(${crops.join(',')})`)
    : removeOutdated);
  if (deleteError) return deleteError;

  if (crops.length === 0) return null;

  const { error } = await supabase
    .from('user_crops')
    .upsert(
      crops.map((cropId) => ({ user_id: userId, crop_id: cropId })),
      { onConflict: 'user_id,crop_id' },
    );
  return error;
}
