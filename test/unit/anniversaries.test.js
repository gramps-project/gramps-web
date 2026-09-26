import {afterEach, describe, expect, it, vi} from 'vitest'

import {GrampsjsViewAnniversaries} from '../../src/views/GrampsjsViewAnniversaries.js'

function createView(version = '3.23.0') {
  const view = new GrampsjsViewAnniversaries()
  view.appState = {
    i18n: {lang: 'en', strings: {}},
    dbInfo: {gramps_webapi: {version}},
    apiGet: vi.fn().mockResolvedValue({data: [], total_count: '0'}),
  }
  return view
}

describe('anniversaries view', () => {
  afterEach(() => vi.useRealTimers())

  it('defaults to the current calendar month and safe event filters', () => {
    vi.useFakeTimers({now: new Date(2026, 8, 24)})
    const view = createView()

    expect(view._start).to.equal('2026-09-01')
    expect(view._end).to.equal('2026-09-30')
    expect(view._eventTypes).to.deep.equal(['Birth', 'Marriage', 'Death'])
    expect(view._livingOnly).to.equal(true)
  })

  it('is hidden until the matching API version is available', () => {
    expect(createView('3.22.9')._supportsAnniversaries()).to.equal(false)
    expect(createView('3.23.0')._supportsAnniversaries()).to.equal(true)
  })

  it('encodes the selected range and filters in the authenticated API query', () => {
    const view = createView()
    view._start = '2026-09-01'
    view._end = '2026-09-30'
    view._eventTypes = ['Birth', 'Death']
    view._anchor = {object: {gramps_id: 'I0044'}}
    view._personTag = 'Close family'

    const query = new URL(`https://example.test${view._queryUrl(2)}`)
      .searchParams

    expect(query.get('start')).to.equal('2026-09-01')
    expect(query.get('end')).to.equal('2026-09-30')
    expect(query.get('event_types')).to.equal('Birth,Death')
    expect(query.get('anchor_gramps_id')).to.equal('I0044')
    expect(query.get('page')).to.equal('2')
    expect(JSON.parse(query.get('person_rules')).rules[0].name).to.equal(
      'HasTag'
    )
  })

  it('loads additional pages without replacing current occurrences', async () => {
    const view = createView()
    view.appState.apiGet
      .mockResolvedValueOnce({
        data: [{event: {handle: 'one'}}],
        total_count: '2',
      })
      .mockResolvedValueOnce({
        data: [{event: {handle: 'two'}}],
        total_count: '2',
      })

    await view._load()
    await view._load(true)

    expect(view._data.map(item => item.event.handle)).to.deep.equal([
      'one',
      'two',
    ])
  })

  it('validates a custom range locally before requesting the API', async () => {
    const view = createView()
    view._start = '2026-10-01'
    view._end = '2026-09-30'

    await view._load()

    expect(view.appState.apiGet).not.toHaveBeenCalled()
    expect(view._data).to.deep.equal([])
    expect(view._error).to.equal(
      'The end date must not precede the start date.'
    )
  })

  it('does not request a calendar when no event type is selected', async () => {
    const view = createView()
    view._eventTypes = []

    await view._load()

    expect(view.appState.apiGet).not.toHaveBeenCalled()
    expect(view._error).to.equal('Select at least one event type.')
  })
})
