import type { ImagePickerAsset } from 'expo-image-picker';

import type { CropId } from '@/constants/crops';
import type { GrowerType } from '@/constants/growerTypes';
import type { LanguageCode } from '@/constants/languages';
import type { Coordinates } from '@/context/PreferencesContext';
import { supabase } from '@/lib/supabase';

// The AgroLens backend (see backend/README.md). A phone can't reach the laptop's
// localhost, so on a device this must be set in mobile/.env.
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

console.log('[AgroLens] API_URL initialized as:', API_URL);

// Uploading a photo over mobile data can be slow.
const TIMEOUT_MS = 45_000;

export type SprayStatus = 'good' | 'moderate' | 'poor';
export type SprayReason = 'rain' | 'wind_strong' | 'wind_calm' | 'heat' | 'cold' | 'dry_air';

export type Weather = {
  /** Local time at the location, without a timezone. */
  time: string;
  temperature_c: number;
  humidity: number;
  wind_kmh: number;
  /** WMO weather code, as used by Open-Meteo. */
  weather_code: number;
  is_day: boolean;
  spraying: {
    status: SprayStatus;
    reasons: SprayReason[];
    /** Local time the status next changes, if that is within the forecast. */
    until: string | null;
  };
};

export type Prediction = {
  label: string;
  crop_id: string | null;
  /** English disease name; null when the leaf is healthy. */
  disease: string | null;
  is_healthy: boolean;
  confidence: number;
};

export type AdviceKind = 'consult_expert' | 'healthy' | 'treatment' | 'pending';

/** The backend's advice for a disease, in the farmer's language when it could be rewritten. */
export type Guidance = {
  cause: string;
  symptoms: string[];
  treatment: string[];
  prevention: string[];
  severity: string | null;
  sources: { title: string; url: string }[];
};

export type Diagnosis = {
  /** null if the result couldn't be saved to the account's history. */
  id: string | null;
  prediction: Prediction;
  alternatives: Prediction[];
  is_confident: boolean;
  advice: Advice;
};

/** `guidance` is only set when kind is "treatment"; `language` is the one it is written in. */
export type Advice = { kind: AdviceKind; guidance: Guidance | null; language: string };

/** A disease the knowledge base covers. */
export type Disease = { label: string; crop_id: string | null; disease: string | null };

export type Tips = { tips: string[]; language: string };

export type AssistantAnswer = { answer: string; sources: Guidance['sources'] };

export type PhotoIssue = 'blurry' | 'too_dark' | 'too_bright' | 'too_small' | 'no_leaf';

export type ApiErrorCode = 'offline' | 'poor_image' | 'crop_not_supported' | 'signed_out' | 'server';

export class ApiError extends Error {
  code: ApiErrorCode;
  /** Why the photo was rejected; only set for `poor_image`. */
  issues: PhotoIssue[];

  constructor(code: ApiErrorCode, issues: PhotoIssue[] = []) {
    super(code);
    this.code = code;
    this.issues = issues;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal });
  } catch (err) {
    console.warn(`[AgroLens API] fetch failed for ${API_URL}${path}:`, err);
    throw new ApiError('offline');
  } finally {
    clearTimeout(timer);
  }

  if (response.ok) return response.json();

  // The backend answers with codes, not sentences, so the app can translate them.
  const detail = (await response.json().catch(() => null))?.detail;
  if (response.status === 401) throw new ApiError('signed_out');
  if (detail?.code === 'poor_image') throw new ApiError('poor_image', detail.issues ?? []);
  if (detail?.code === 'crop_not_supported') throw new ApiError('crop_not_supported');
  throw new ApiError('server');
}

export function fetchWeather({ latitude, longitude }: Coordinates): Promise<Weather> {
  return request(`/weather?lat=${latitude}&lon=${longitude}`);
}

/** Crop ids the disease model can diagnose. */
export async function fetchSupportedCrops(): Promise<string[]> {
  const health = await request<{ crops: string[] }>('/health');
  return health.crops;
}

/** The signed-in user's token, which the backend checks with Supabase. */
async function authorization(): Promise<{ Authorization: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError('signed_out');
  return { Authorization: `Bearer ${token}` };
}

export function fetchLibrary(): Promise<Disease[]> {
  return request('/library');
}

/** The guidance for a disease, as shown after a diagnosis. */
export async function fetchAdvice(
  label: string,
  language: LanguageCode,
  growerType: GrowerType | null,
): Promise<Advice> {
  const query = new URLSearchParams({ label, language });
  if (growerType) query.set('grower_type', growerType);
  return request(`/advice?${query}`, { headers: await authorization() });
}

/** How to keep a crop free of the diseases the knowledge base covers. */
export async function fetchTips(cropId: string, language: LanguageCode): Promise<Tips> {
  const query = new URLSearchParams({ crop_id: cropId, language });
  return request(`/tips?${query}`, { headers: await authorization() });
}

/** Diseases of these crops that the current weather favours. */
export function fetchAlerts({ latitude, longitude }: Coordinates, crops: CropId[]): Promise<Disease[]> {
  return request(`/alerts?lat=${latitude}&lon=${longitude}&crops=${crops.join(',')}`);
}

export async function askAssistant(
  question: string,
  language: LanguageCode,
  crops: CropId[],
): Promise<AssistantAnswer> {
  return request('/assistant', {
    method: 'POST',
    headers: { ...(await authorization()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, language, crops }),
  });
}

type DiagnoseInput = {
  photo: ImagePickerAsset;
  cropId: CropId;
  language: LanguageCode;
  growerType: GrowerType | null;
  location: Coordinates | null;
};

export async function diagnoseLeaf({
  photo,
  cropId,
  language,
  growerType,
  location,
}: DiagnoseInput): Promise<Diagnosis> {
  const headers = await authorization();

  const form = new FormData();
  if (photo.file) {
    // Web gives a real File.
    form.append('image', photo.file);
  } else {
    // React Native 0.86+ requires a proper Blob for FormData uploads.
    // expo-file-system/next's File class implements Blob and works with local URIs.
    const { File: ExpoFile } = await import('expo-file-system/next');
    const blob = new ExpoFile(photo.uri);
    form.append('image', blob as unknown as Blob, photo.fileName ?? 'leaf.jpg');
  }
  form.append('crop_id', cropId);
  form.append('language', language);
  if (growerType) form.append('grower_type', growerType);
  if (location) {
    form.append('latitude', String(location.latitude));
    form.append('longitude', String(location.longitude));
  }

  return request('/diagnose', {
    method: 'POST',
    headers,
    body: form,
  });
}
