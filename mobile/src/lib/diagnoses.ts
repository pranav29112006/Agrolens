import { isCropId, type CropId } from '@/constants/crops';
import { supabase } from '@/lib/supabase';

const PHOTO_BUCKET = 'leaf-photos';
// Photos are private, so the list gets links that work for an hour.
const PHOTO_LINK_SECONDS = 60 * 60;
const HISTORY_LIMIT = 50;

export type SavedDiagnosis = {
  id: string;
  /** The model's class name, e.g. "tomato___Late_blight". */
  label: string;
  cropId: CropId | null;
  /** English disease name; null when the leaf was healthy. */
  disease: string | null;
  confidence: number | null;
  isConfident: boolean;
  createdAt: string;
  photoUrl: string | null;
};

/** "tomato___Late_blight" -> "Late blight"; null for a healthy leaf. */
export function diseaseName(label: string): string | null {
  const condition = label.split('___')[1] ?? label;
  return condition === 'healthy' ? null : condition.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * The signed-in account's past leaf scans, newest first, or just the one with `id`.
 * Returns null when they could not be read.
 */
export async function loadDiagnoses(id?: string): Promise<SavedDiagnosis[] | null> {
  const query = supabase
    .from('diagnoses')
    .select('id, crop_id, image_path, predicted_label, confidence, is_confident, created_at')
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  const { data, error } = await (id ? query.eq('id', id) : query);

  if (error) {
    console.warn('Could not read diagnoses:', error.message);
    return null;
  }

  const paths = data.map((row) => row.image_path).filter((path): path is string => Boolean(path));
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const links = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, PHOTO_LINK_SECONDS);
    for (const link of links.data ?? []) {
      if (link.path && link.signedUrl) urls.set(link.path, link.signedUrl);
    }
  }

  return data.map((row) => ({
    id: row.id,
    label: row.predicted_label,
    cropId: typeof row.crop_id === 'string' && isCropId(row.crop_id) ? row.crop_id : null,
    disease: diseaseName(row.predicted_label),
    confidence: row.confidence,
    isConfident: row.is_confident,
    createdAt: row.created_at,
    photoUrl: urls.get(row.image_path) ?? null,
  }));
}
