import {describe, it, expect} from 'vitest'
import {getEnclosingPlaces} from '../../src/util.js'

// a fake appState answering GET /api/places/<handle>?backlinks=true
const appStateWith = enclosed => ({
  apiGet: async url => {
    const handle = url.split('/')[3].split('?')[0]
    return {data: {handle, backlinks: {place: enclosed[handle] ?? []}}}
  },
})

describe('getEnclosingPlaces', () => {
  const appState = appStateWith({county: ['city'], city: [], farm: []})

  it('returns places that other places are enclosed by', async () => {
    expect(await getEnclosingPlaces(appState, ['county', 'farm'])).toEqual([
      'county',
    ])
  })

  it('ignores enclosed places deleted along with them', async () => {
    expect(await getEnclosingPlaces(appState, ['county', 'city'])).toEqual([])
  })

  it('ignores a place enclosed by itself', async () => {
    const self = appStateWith({loop: ['loop']})
    expect(await getEnclosingPlaces(self, ['loop'])).toEqual([])
  })

  it('does not block when the backlinks cannot be read', async () => {
    const failing = {apiGet: async () => ({error: 'Not found'})}
    expect(await getEnclosingPlaces(failing, ['county'])).toEqual([])
  })
})
