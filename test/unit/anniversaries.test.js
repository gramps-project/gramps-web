import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  calendarGridDates,
  formatRange,
  GrampsjsViewAnniversaries,
  monthRange,
  partitionTypeOptions,
  rangeError,
  upcomingRange,
} from '../../src/views/GrampsjsViewAnniversaries.js'

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
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('defaults to the next four weeks and safe filters', () => {
    vi.useFakeTimers({now: new Date(2026, 8, 24)})
    const view = createView()

    expect(monthRange()).to.deep.equal({
      start: '2026-09-01',
      end: '2026-09-30',
    })
    expect(upcomingRange()).to.deep.equal({
      start: '2026-09-24',
      end: '2026-10-18',
    })
    expect(view._start).to.equal('2026-09-24')
    expect(view._end).to.equal('2026-10-18')
    expect(view._eventTypes).to.deep.equal(['Birth', 'Marriage', 'Death'])
    expect(view._livingOnly).to.equal(true)
    expect(view._primaryOnly).to.equal(true)
    expect(view._wholeTree).to.equal(true)
    expect(view._mode).to.equal('list')
    expect(view._settingsOpen).to.equal(false)
  })

  it('formats a full month as a compact navigation label', () => {
    expect(formatRange('2026-09-01', '2026-09-30', 'en')).to.equal(
      'September 2026'
    )
  })

  it('shows exactly four Monday-to-Sunday weeks in the default range', () => {
    const dates = calendarGridDates('2026-09-30', '2026-10-25')

    expect(dates.filter(Boolean)).to.have.length(28)
    expect(dates.slice(0, 4)).to.deep.equal([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
    ])
    expect(dates.at(-1)).to.equal('2026-10-25')
    expect(dates).not.to.include('2026-10-26')
  })

  it('loads visible past weekdays in the calendar, but not in the upcoming list', async () => {
    const view = createView()
    view._start = '2026-09-30'
    view._end = '2026-10-25'

    await view._load()
    expect(
      new URL(
        `https://example.test${view.appState.apiGet.mock.calls[0][0]}`
      ).searchParams.get('start')
    ).to.equal('2026-09-30')

    view.appState.apiGet.mockResolvedValueOnce({
      data: [
        {
          occurrence_date: '2026-09-29',
          summary: 'Anniversary on a visible past day',
          event: {handle: 'past-event'},
        },
      ],
      total_count: '1',
    })
    await view._setMode('grid')

    const request = new URL(
      `https://example.test${view.appState.apiGet.mock.calls[1][0]}`
    )
    expect(request.searchParams.get('start')).to.equal('2026-09-28')
    expect(view._data[0].occurrence_date).to.equal('2026-09-29')
  })

  it('keeps filters in a settings dialog instead of the main view', () => {
    const view = createView()
    const markup = view.renderContent().strings.join('')

    expect(markup).to.contain('class="period-navigation"')
    expect(markup).not.to.contain('class="toolbar"')
    expect(view._settingsOpen).to.equal(false)

    view._openSettings()
    expect(view._settingsOpen).to.equal(true)
    view._closeSettings()
    expect(view._settingsOpen).to.equal(false)
  })

  it('subtly highlights milestone rows without rendering a badge', () => {
    const view = createView()
    view._data = [
      {
        anniversary: 25,
        occurrence_date: '2026-09-30',
        event_date: '1901',
        historical_date: '1901-09-30',
        type: 'Birth',
        participants: [],
      },
    ]

    const row = view._renderList().values[0][0]

    expect(row.values[0]).to.equal('milestone')
    expect(row.strings.join('')).not.to.contain('Milestone')
  })

  it('is hidden until the matching API version is available', () => {
    expect(createView('3.22.9')._supportsAnniversaries()).to.equal(false)
    expect(createView('3.23.0')._supportsAnniversaries()).to.equal(true)
  })

  it('validates exact dates and a five-calendar-year maximum', () => {
    expect(rangeError('2026-02-30', '2026-03-01')).to.equal(
      'Enter a valid date range.'
    )
    expect(rangeError('2026-10-01', '2026-09-30')).to.equal(
      'The end date must not precede the start date.'
    )
    expect(rangeError('2024-02-29', '2029-02-28')).to.equal('')
    expect(rangeError('2024-02-29', '2029-03-01')).to.equal(
      'The date range must not exceed five years.'
    )
  })

  it('encodes tag rules without querying unavailable saved filters', () => {
    const view = createView()
    view._start = '2026-09-01'
    view._end = '2026-09-30'
    view._eventTypes = ['Birth', 'Death']
    view._personRules = [{name: 'HasTag', values: ['Close family']}]
    view._eventRules = [{name: 'HasTag', values: ['Calendar']}]

    const query = new URL(`https://example.test${view._queryUrl(2)}`)
      .searchParams

    expect(query.get('start')).to.equal('2026-09-01')
    expect(query.get('end')).to.equal('2026-09-30')
    expect(query.get('event_types')).to.equal('Birth,Death')
    expect(query.has('person_filter')).to.equal(false)
    expect(query.has('filter')).to.equal(false)
    expect(query.get('page')).to.equal('2')
    expect(JSON.parse(query.get('person_rules'))).to.deep.equal({
      rules: view._personRules,
    })
    expect(JSON.parse(query.get('rules'))).to.deep.equal({
      rules: view._eventRules,
    })
  })

  it('requires a Person filter when Whole tree is disabled', () => {
    const view = createView()
    view._wholeTree = false

    expect(view._validationMessage()).to.equal(
      'Select a Person filter or include the Whole tree.'
    )

    view._personRules = [{name: 'HasTag', values: ['Family']}]
    expect(view._validationMessage()).to.equal('')
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

  it('loads every remaining page before displaying the month grid', async () => {
    const view = createView()
    view._data = [{event: {handle: 'one'}}]
    view._total = 2
    view._page = 1
    view.appState.apiGet
      .mockResolvedValueOnce({
        data: [{event: {handle: 'one'}}],
        total_count: '2',
      })
      .mockResolvedValueOnce({
        data: [{event: {handle: 'two'}}],
        total_count: '2',
      })

    await view._setMode('grid')

    expect(view._mode).to.equal('grid')
    expect(view._data).to.have.length(2)
  })

  it('keeps default event types when type discovery fails', async () => {
    const view = createView()
    view.appState.apiGet.mockRejectedValue(new Error('types unavailable'))

    await view._loadTypes()

    expect(view._typesStatus).to.equal('unavailable')
    expect(view._typeOptions.map(option => option.value)).to.deep.equal([
      'Birth',
      'Marriage',
      'Death',
    ])
  })

  it('keeps the event type controls compact for large catalogs', () => {
    const options = [
      ...['Birth', 'Marriage', 'Death', 'Adoption'].map(value => ({
        value,
        label: value,
      })),
      ...Array.from({length: 100}, (_, index) => ({
        value: `Custom ${index}`,
        label: `Custom ${index}`,
      })),
    ]

    const {visible, available} = partitionTypeOptions(options, [
      'Birth',
      'Marriage',
      'Death',
      'Adoption',
    ])

    expect(visible.map(option => option.value)).to.deep.equal([
      'Birth',
      'Marriage',
      'Death',
      'Adoption',
    ])
    expect(available).to.have.length(100)
  })
})
