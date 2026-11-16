// `glyph` is a characteristic letter of the language's script, shown as the tile badge.
export const LANGUAGES = [
  { code: 'ml', glyph: 'അ', name: 'മലയാളം', tagline: 'നിങ്ങളുടെ ഭാഷയിൽ കൃഷി' },
  { code: 'bn', glyph: 'অ', name: 'বাংলা', tagline: 'চাষাবাদের কথা আপনার ভাষায়' },
  { code: 'or', glyph: 'ଅ', name: 'ଓଡ଼ିଆ', tagline: 'ଆପଣଙ୍କ ଭାଷାରେ କୃଷିକାର୍ଯ୍ୟ' },
  { code: 'pa', glyph: 'ਅ', name: 'ਪੰਜਾਬੀ', tagline: 'ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਵਿੱਚ ਖੇਤੀਬਾੜੀ' },
  { code: 'ur', glyph: 'ے', name: 'اردو', tagline: 'آپ کی زبان میں کاشتکاری' },
  { code: 'gu', glyph: 'અ', name: 'ગુજરાતી', tagline: 'ખેતી તમારી ભાષામાં' },
  { code: 'te', glyph: 'అ', name: 'తెలుగు', tagline: 'మీ భాషలో వ్యవసాయం' },
  { code: 'kn', glyph: 'ಅ', name: 'ಕನ್ನಡ', tagline: 'ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಕೃಷಿ' },
  { code: 'mr', glyph: 'म', name: 'मराठी', tagline: 'स्वतःच्या भाषेत शेती' },
  { code: 'ta', glyph: 'அ', name: 'தமிழ்', tagline: 'உங்கள் மொழியில் வேளாண்மை' },
  { code: 'hi', glyph: 'ह', name: 'हिन्दी', tagline: 'खेती आपकी भाषा में' },
  { code: 'en', glyph: 'A', name: 'English', tagline: 'Farming in your language' },
  { code: 'fr', glyph: 'Ç', name: 'Français', tagline: "L'agriculture dans votre langue" },
  { code: 'pt', glyph: 'Ã', name: 'Português', tagline: 'Agricultura no seu idioma' },
  { code: 'es', glyph: 'Ñ', name: 'Español', tagline: 'Información agrícola en su idioma' },
  { code: 'id', glyph: 'I', name: 'Indonesia', tagline: 'Bertani dalam bahasa Anda' },
  { code: 'vi', glyph: 'Ư', name: 'Tiếng Việt', tagline: 'Làm nông nghiệp bằng ngôn ngữ của bạn' },
  { code: 'ar', glyph: 'ع', name: 'العربية', tagline: 'الزراعة بلغتك' },
  { code: 'sw', glyph: 'K', name: 'Kiswahili', tagline: 'Kilimo katika lugha yako' },
] as const;

export type Language = (typeof LANGUAGES)[number];
export type LanguageCode = Language['code'];

export function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGES.some((language) => language.code === value);
}
