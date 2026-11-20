import {describe, it, expect, vi} from 'vitest'
import {mdiLock, mdiLockOpenVariantOutline} from '@mdi/js'
import {
  GrampsjsViewObjectsBase,
  privacyColumn,
  tagsColumn,
} from '../../src/views/GrampsjsViewObjectsBase.js'

const idColumn = {name: 'Gramps ID', key: 'grampsId', sortKey: 'gramps_id'}

function makeView({canViewPrivate = true, saved, rows = []} = {}) {
  const view = Object.create(GrampsjsViewObjectsBase.prototype)
  view._columns = [idColumn, tagsColumn, privacyColumn]
  view._objectsName = 'notes'
  view._pageSize = 24
  view._selectionKey = 0
  view.dispatchEvent = vi.fn()
  view.appState = {
    permissions: {canViewPrivate},
    settings: {columns: saved ? {notes: saved} : {}},
    i18n: {strings: {}},
    apiGet: vi.fn().mockResolvedValue({data: rows, total_count: rows.length}),
  }
  Object.defineProperty(view, '_fullUrl', {value: '/api/notes/?page=1'})
  view._formatRow = row => ({grampsId: row.gramps_id})
  return view
}

describe('the privacy column', () => {
  it('is hidden by default', () => {
    const view = makeView()
    expect(view._offeredColumns).toContain(privacyColumn)
    expect(view._visibleColumns).not.toContain(privacyColumn)
  })

  it('is shown once chosen', () => {
    const view = makeView({saved: ['grampsId', 'private']})
    expect(view._visibleColumns).toEqual([idColumn, privacyColumn])
  })

  it('is not offered to users who cannot view private records', () => {
    const view = makeView({
      canViewPrivate: false,
      saved: ['grampsId', 'private'],
    })
    expect(view._offeredColumns).not.toContain(privacyColumn)
    expect(view._visibleColumns).toEqual([idColumn])
  })

  it('shows a closed lock for private and an open lock for public rows', async () => {
    const view = makeView({
      rows: [
        {handle: 'a', gramps_id: 'N1', private: true},
        {handle: 'b', gramps_id: 'N2', private: false},
      ],
    })
    view._fetchData()
    await vi.waitFor(() => expect(view._data).toHaveLength(2))
    expect(view._data[0].grampsId).toBe('N1')
    const [privateIcon, publicIcon] = view._data.map(row => row.private.values)
    expect(privateIcon).toContain(mdiLock)
    expect(privateIcon).toContain('Record is private')
    expect(publicIcon).toContain(mdiLockOpenVariantOutline)
    expect(publicIcon).toContain('Record is public')
  })
})
