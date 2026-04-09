export const LANG_MAP = {
  Hindi: 'HI',
  English: 'EN',
  Japanese: 'JP',
  Korean: 'KR',
  Chinese: 'CN',
  Tamil: 'TA',
  Telugu: 'TE',
  Bengali: 'BN',
  Kannada: 'KN',
  Malayalam: 'ML',
  Marathi: 'MR',
  Gujarati: 'GU',
  Punjabi: 'PA',
  Odia: 'OD',
  Spanish: 'ES',
  French: 'FR',
  German: 'DE',
  Italian: 'IT',
  Portuguese: 'PT',
  Russian: 'RU',
  Arabic: 'AR',
  Thai: 'TH',
  Vietnamese: 'VI',
  Indonesian: 'ID',
  Malay: 'MS',
  Filipino: 'PH',
  Turkish: 'TR',
  Polish: 'PL',
  Dutch: 'NL',
  Swedish: 'SV',
  Norwegian: 'NO',
  Danish: 'DA',
  Finnish: 'FI',
  Czech: 'CZ',
  Romanian: 'RO',
  Hungarian: 'HU',
  Greek: 'GR',
  Hebrew: 'HE',
  Persian: 'FA',
  Urdu: 'UR',
}

export const LANG_PRESETS = Object.keys(LANG_MAP)

export function sanitizeUrl(url) {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href
    }
  } catch { /* invalid URL */ }
  return ''
}

export function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function parseLanguages(raw) {
  if (!raw) return []
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export function normalizeSeason(s) {
  return {
    number: s.number ?? s.season_number ?? 1,
    total_episodes: s.total_episodes ?? s.total ?? 0,
    watched_episodes: s.watched_episodes ?? s.watched ?? 0,
    comment: s.comment ?? '',
    is_completed:
      s.is_completed ??
      s.completed ??
      ((s.total_episodes ?? s.total ?? 0) > 0 &&
        (s.watched_episodes ?? s.watched ?? 0) >= (s.total_episodes ?? s.total ?? 0)),
  }
}

export function normalizeAnime(raw) {
  return {
    id: raw.id,
    temp_id: raw.temp_id || null,
    name: raw.name || '',
    thumbnail_url: raw.thumbnail_url || '',
    language: raw.language || '',
    stars: raw.stars ?? null,
    order: raw.order ?? 0,
    seasons: (raw.seasons || []).map(normalizeSeason),
  }
}

export function isOva(seasonNumber) {
  return seasonNumber % 1 !== 0
}

export function getSeasonLabel(seasonNumber) {
  if (isOva(seasonNumber)) {
    const afterSeason = Math.floor(seasonNumber)
    return `OVA(after S${afterSeason})`
  }
  return `S${Math.floor(seasonNumber)}`
}

export function getLanguageAbbreviation(lang) {
  return LANG_MAP[lang] || lang.substring(0, 2).toUpperCase()
}
