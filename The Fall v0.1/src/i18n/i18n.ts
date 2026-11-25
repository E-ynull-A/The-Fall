import { AZ_TEXT, AZ_PATTERNS } from './az';

/**
 * Lightweight i18n (no dependency). Keys are the English source strings, so content
 * data stays readable and untranslated text falls back to English.
 * Dynamic engine messages are translated through regex patterns.
 */

export type Lang = 'en' | 'az';
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'az', label: 'Azərbaycanca' },
  { id: 'en', label: 'English' },
];

const KEY = 'thefall.lang';

export type Pattern = [RegExp, (m: RegExpMatchArray, t: (s: string) => string) => string];

const DICTS: Record<Exclude<Lang, 'en'>, { text: Record<string, string>; patterns: Pattern[] }> = {
  az: { text: AZ_TEXT, patterns: AZ_PATTERNS },
};

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'az') return saved;
  } catch {
    /* storage unavailable */
  }
  return 'az';
}

let current: Lang = typeof window === 'undefined' ? 'en' : detect();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* keep in memory only */
  }
  try {
    document.documentElement.lang = lang;
  } catch {
    /* no document (tests) */
  }
}

/** Translates a string to the current language. Unknown strings are returned unchanged. */
export function tr(text: string | null | undefined, lang: Lang = current): string {
  if (text === null || text === undefined) return '';
  if (lang === 'en' || text === '') return text;
  const dict = DICTS[lang];
  const exact = dict.text[text];
  if (exact !== undefined) return exact;
  for (const [re, fn] of dict.patterns) {
    const m = text.match(re);
    if (m) return fn(m, (x) => tr(x, lang));
  }
  return text;
}
