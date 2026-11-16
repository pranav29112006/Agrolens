export type CropCategory =
  | 'fruit'
  | 'vegetable'
  | 'cereal'
  | 'pulse'
  | 'oilseed'
  | 'cash'
  | 'spice'
  | 'flower';

// Ids are stable identifiers shared with the backend and database; display names live in i18n.
export const CROPS = [
  { id: 'almond', category: 'fruit' },
  { id: 'apple', category: 'fruit' },
  { id: 'apricot', category: 'fruit' },
  { id: 'banana', category: 'fruit' },
  { id: 'barley', category: 'cereal' },
  { id: 'bean', category: 'pulse' },
  { id: 'bitter_gourd', category: 'vegetable' },
  { id: 'black_green_gram', category: 'pulse' },
  { id: 'brinjal', category: 'vegetable' },
  { id: 'broad_bean', category: 'pulse' },
  { id: 'cabbage', category: 'vegetable' },
  { id: 'canola', category: 'oilseed' },
  { id: 'capsicum_chilli', category: 'vegetable' },
  { id: 'carrot', category: 'vegetable' },
  { id: 'cassava', category: 'vegetable' },
  { id: 'castor_bean', category: 'oilseed' },
  { id: 'cauliflower', category: 'vegetable' },
  { id: 'cherry', category: 'fruit' },
  { id: 'chickpea_gram', category: 'pulse' },
  { id: 'citrus', category: 'fruit' },
  { id: 'coconut', category: 'fruit' },
  { id: 'coffee', category: 'cash' },
  { id: 'cotton', category: 'cash' },
  { id: 'cucumber', category: 'vegetable' },
  { id: 'currant', category: 'fruit' },
  { id: 'durian', category: 'fruit' },
  { id: 'ginger', category: 'spice' },
  { id: 'grape', category: 'fruit' },
  { id: 'guar', category: 'pulse' },
  { id: 'guava', category: 'fruit' },
  { id: 'jackfruit', category: 'fruit' },
  { id: 'litchi', category: 'fruit' },
  { id: 'maize', category: 'cereal' },
  { id: 'mango', category: 'fruit' },
  { id: 'marigold', category: 'flower' },
  { id: 'melon', category: 'fruit' },
  { id: 'millet', category: 'cereal' },
  { id: 'okra', category: 'vegetable' },
  { id: 'olive', category: 'fruit' },
  { id: 'onion', category: 'vegetable' },
  { id: 'ornamental', category: 'flower' },
  { id: 'papaya', category: 'fruit' },
  { id: 'pea', category: 'pulse' },
  { id: 'peach', category: 'fruit' },
  { id: 'peanut', category: 'oilseed' },
  { id: 'pear', category: 'fruit' },
  { id: 'pigeon_pea_red_gram', category: 'pulse' },
  { id: 'pineapple', category: 'fruit' },
  { id: 'pistachio', category: 'fruit' },
  { id: 'pomegranate', category: 'fruit' },
  { id: 'potato', category: 'vegetable' },
  { id: 'pumpkin', category: 'vegetable' },
  { id: 'rice', category: 'cereal' },
  { id: 'rose', category: 'flower' },
  { id: 'sesame', category: 'oilseed' },
  { id: 'sorghum', category: 'cereal' },
  { id: 'soybean', category: 'pulse' },
  { id: 'strawberry', category: 'fruit' },
  { id: 'sugar_beet', category: 'cash' },
  { id: 'sugarcane', category: 'cash' },
  { id: 'sunflower', category: 'oilseed' },
  { id: 'taro', category: 'vegetable' },
  { id: 'tea', category: 'cash' },
  { id: 'tobacco', category: 'cash' },
  { id: 'tomato', category: 'vegetable' },
  { id: 'turmeric', category: 'spice' },
  { id: 'wheat', category: 'cereal' },
  { id: 'zucchini', category: 'vegetable' },
] as const satisfies readonly { id: string; category: CropCategory }[];

export type CropId = (typeof CROPS)[number]['id'];

/** Soft background behind each crop icon, so crop types are easy to tell apart at a glance. */
export const CROP_CATEGORY_TINTS: Record<CropCategory, string> = {
  fruit: '#FCE7E3',
  vegetable: '#E2F0E6',
  cereal: '#FBF0D4',
  pulse: '#EEEBDD',
  oilseed: '#FFF4C8',
  cash: '#E3EDF5',
  spice: '#FCE8D2',
  flower: '#F8E4EE',
};

const CROP_IDS = new Set<string>(CROPS.map((crop) => crop.id));

export function isCropId(value: string): value is CropId {
  return CROP_IDS.has(value);
}
