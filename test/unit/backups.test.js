import {describe, it, expect} from 'vitest'
import {
  backupFileType,
  backupRestoreUrl,
  formatBackupCount,
  formatBackupDate,
  xmlRestoreUrl,
} from '../../src/backups.js'
import {formatBytes} from '../../src/util.js'

describe('backupRestoreUrl', () => {
  const all = {data: true, tree_settings: true, users: true}

  it('restores a stored backup', () => {
    expect(backupRestoreUrl('abc', all, false)).toBe(
      '/api/backups/abc/restore?dry_run=false&data=true&tree_settings=true&users=true'
    )
  })

  it('restores an uploaded archive without a backup ID', () => {
    expect(backupRestoreUrl('', all, true)).toBe(
      '/api/backups/restore?dry_run=true&data=true&tree_settings=true&users=true'
    )
  })

  it('passes deselected parts as false', () => {
    const url = backupRestoreUrl('abc', {users: true}, true)
    const params = new URL(url, 'http://localhost').searchParams
    expect(params.get('data')).toBe('false')
    expect(params.get('tree_settings')).toBe('false')
    expect(params.get('users')).toBe('true')
  })

  it('encodes the backup ID', () => {
    expect(backupRestoreUrl('a/b', all, false)).toMatch(
      /^\/api\/backups\/a%2Fb\/restore\?/
    )
  })
})

describe('formatBackupDate', () => {
  it('formats a manifest date', () => {
    const formatted = formatBackupDate('2026-10-14T12:00:00Z', 'en')
    expect(formatted).toMatch(/2026/)
    expect(formatted).toMatch(/Oct/)
  })

  it('accepts underscore and invalid locales', () => {
    expect(formatBackupDate('2026-10-14T12:00:00Z', 'pt_PT')).toMatch(/2026/)
    expect(formatBackupDate('2026-10-14T12:00:00Z', '')).toMatch(/2026/)
    expect(formatBackupDate('2026-10-14T12:00:00Z', 'not a locale')).toMatch(
      /2026/
    )
  })

  it('returns unparseable values unchanged', () => {
    expect(formatBackupDate('garbage')).toBe('garbage')
    expect(formatBackupDate(undefined)).toBe('')
  })
})

describe('formatBackupCount', () => {
  it('formats counts with the locale', () => {
    expect(formatBackupCount(12345, 'en')).toBe('12,345')
    expect(formatBackupCount(12345, 'de_DE')).toBe('12.345')
  })

  it('treats a missing count as zero', () => {
    expect(formatBackupCount(undefined, '')).toBe('0')
  })
})

describe('formatBytes', () => {
  it('uses decimal prefixes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1500)).toBe('1.5 kB')
    expect(formatBytes(2500000)).toBe('2.5 MB')
  })
})

describe('xmlRestoreUrl', () => {
  it('adds dry_run only for a preview', () => {
    expect(xmlRestoreUrl(true)).toBe(
      '/api/importers/gramps/file/restore?dry_run=true'
    )
    expect(xmlRestoreUrl(false)).toBe('/api/importers/gramps/file/restore')
  })
})

describe('backupFileType', () => {
  it('recognizes backup archives and Gramps XML', () => {
    expect(backupFileType('gramps-web-backup-tree-20261014.tar')).toBe(
      'archive'
    )
    expect(backupFileType('Export.GRAMPS')).toBe('xml')
  })

  it('rejects other files', () => {
    expect(backupFileType('tree.gpkg')).toBe('')
    expect(backupFileType('backup.tar.gz')).toBe('')
    expect(backupFileType(undefined)).toBe('')
  })
})
