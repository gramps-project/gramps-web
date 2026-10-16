// Helpers for the stored backups of a tree and restoring from them.

// The Intl locale for a Gramps language code such as "pt_PT".
function intlLocale(lang) {
  const locale = (lang || 'en').replace('_', '-')
  try {
    Intl.getCanonicalLocales(locale)
  } catch {
    return 'en'
  }
  return locale
}

// Formats a backup's creation time from its manifest (UTC, as
// "2026-10-14T12:00:00Z") in the local time zone.
export function formatBackupDate(created, lang = 'en') {
  const date = new Date(created)
  if (!created || Number.isNaN(date.getTime())) {
    return created ?? ''
  }
  return date.toLocaleString(intlLocale(lang), {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// A backup's creation time from its manifest as a Unix timestamp in seconds,
// or null if it can't be parsed.
export function backupTimestamp(created) {
  const ms = Date.parse(created ?? '')
  return Number.isNaN(ms) ? null : ms / 1000
}

// Formats a count from a backup's manifest.
export function formatBackupCount(count, lang = 'en') {
  return new Intl.NumberFormat(intlLocale(lang)).format(count ?? 0)
}

// The endpoint restoring the selected parts ({data, tree_settings, users})
// from a stored backup, or from an uploaded archive if `backupId` is empty.
export function backupRestoreUrl(backupId, parts, dryRun) {
  const params = new URLSearchParams({
    dry_run: String(Boolean(dryRun)),
    data: String(Boolean(parts?.data)),
    tree_settings: String(Boolean(parts?.tree_settings)),
    users: String(Boolean(parts?.users)),
  })
  const base = backupId
    ? `/api/backups/${encodeURIComponent(backupId)}/restore`
    : '/api/backups/restore'
  return `${base}?${params.toString()}`
}

// The endpoint resetting the tree to an uploaded Gramps XML file.
export function xmlRestoreUrl(dryRun) {
  return `/api/importers/gramps/file/restore${dryRun ? '?dry_run=true' : ''}`
}

// The kind of file a backup restore accepts: 'archive' for a Gramps Web
// backup, 'xml' for Gramps XML, or '' for anything else.
export function backupFileType(name) {
  const lower = (name ?? '').toLowerCase()
  if (lower.endsWith('.tar')) {
    return 'archive'
  }
  if (lower.endsWith('.gramps')) {
    return 'xml'
  }
  return ''
}
