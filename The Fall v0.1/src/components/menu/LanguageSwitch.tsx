import { LANGS, getLang, type Lang } from '../../i18n/i18n';

/** Language picker. `onChange` must re-render the app (handled by Root). */
export function LanguageSwitch({ onChange, light = false }: { onChange: (lang: Lang) => void; light?: boolean }) {
  const current = getLang();
  return (
    <div className={`segmented lang-switch ${light ? 'segmented--light' : ''}`} role="radiogroup" aria-label="Language / Dil">
      {LANGS.map((l) => (
        <button
          key={l.id}
          role="radio"
          aria-checked={current === l.id}
          className={`segmented__option ${current === l.id ? 'segmented__option--active' : ''}`}
          onClick={() => onChange(l.id)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
