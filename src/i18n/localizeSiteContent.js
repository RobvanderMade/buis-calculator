import { pickSiteContentForLocale } from '../siteContentRepository.js'

/** @deprecated Gebruik pickSiteContentForLocale uit siteContentRepository. */
export function localizeSiteContent(content, locale) {
  return pickSiteContentForLocale(content, locale)
}
