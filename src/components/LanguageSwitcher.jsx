import { LOCALES, useI18n } from '../i18n/I18nContext.jsx'

export default function LanguageSwitcher({ className = '' }) {
  const { locale, setLocale, t, isAdminLocale } = useI18n()

  if (isAdminLocale) return null

  return (
    <div
      className={`lang-switcher lang-switcher--header ${className}`.trim()}
      role="group"
      aria-label={t('common.language')}
    >
      {LOCALES.map((item) => (
        <button
          key={item.id}
          type="button"
          className={
            locale === item.id
              ? 'lang-switcher__btn lang-switcher__btn--active'
              : 'lang-switcher__btn'
          }
          onClick={() => setLocale(item.id)}
          aria-pressed={locale === item.id}
          aria-label={t(item.labelKey)}
          title={t(item.labelKey)}
        >
          {item.shortLabel}
        </button>
      ))}
    </div>
  )
}
