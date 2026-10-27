import {render} from 'lit'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {gregorianSdn} from '../../src/gcalendar.js'
import {GrampsjsViewAnniversaries} from '../../src/views/GrampsjsViewAnniversaries.js'
import {
  buildAnniversaryOccurrences,
  GrampsjsViewAnniversaryCalendar,
} from '../../src/views/GrampsjsViewAnniversaryCalendar.js'

function createView() {
  const view = new GrampsjsViewAnniversaryCalendar()
  view.appState = {
    i18n: {lang: 'en', strings: {}},
    apiGet: vi.fn().mockResolvedValue({data: [], total_count: '0'}),
  }
  return view
}

function person(handle, grampsId = handle, name = handle) {
  return {handle, gramps_id: grampsId, name_display: name, profile: {}}
}

function event({
  handle = 'event-1',
  type = 'Birth',
  day = 1,
  month = 1,
  year = 2000,
  modifier = 0,
  quality = 0,
  role = 'Primary',
  participant = person('person-1', 'I0001', 'Ada Example'),
  family,
}) {
  const dateYear = year || 4
  const participants = family
    ? {people: [], families: [{role, family}]}
    : {people: [{role, person: participant}], families: []}
  return {
    handle,
    gramps_id: handle,
    type,
    date: {
      dateval: [day, month, year, false],
      modifier,
      quality,
      sortval: gregorianSdn(dateYear, month, day),
    },
    profile: {
      date: `${day}/${month}/${year || ''}`,
      participants,
      type,
    },
  }
}

const build = (events, options = {}) =>
  buildAnniversaryOccurrences({
    events,
    start: '2026-01-01',
    end: '2026-12-31',
    translate: value => value,
    ...options,
  })

describe('anniversary date window', () => {
  afterEach(() => vi.useRealTimers())

  it('defaults to a Monday-to-Sunday four-week window', () => {
    vi.useFakeTimers({now: new Date(2026, 8, 24)})
    const view = createView()

    expect(view._start).toBe('2026-09-21')
    expect(view._end).toBe('2026-10-18')
  })

  it('moves the complete window by four weeks', () => {
    const view = createView()
    view._start = '2026-09-21'
    view._end = '2026-10-18'
    view._setPeriod(1)

    expect(view._start).toBe('2026-10-19')
    expect(view._end).toBe('2026-11-15')
  })

  it('refreshes the current window when the date changes', () => {
    vi.useFakeTimers({now: new Date(2026, 8, 24)})
    const view = createView()
    view.active = true
    view._load = vi.fn()

    vi.setSystemTime(new Date(2026, 8, 28))
    view._refreshData()

    expect(view._start).toBe('2026-09-28')
    expect(view._end).toBe('2026-10-25')
    expect(view._load).toHaveBeenCalledOnce()
  })

  it('reloads when tree data changes or the page becomes visible', () => {
    const view = createView()
    view.active = true
    view._load = vi.fn()
    view.connectedCallback()

    window.dispatchEvent(new Event('db:changed'))
    document.dispatchEvent(new Event('visibilitychange'))

    expect(view._load).toHaveBeenCalledTimes(2)
    view.disconnectedCallback()
  })
})

describe('event collection', () => {
  it('uses the events endpoint, default types, and only the fields it displays', async () => {
    const view = createView()
    view._start = '2026-10-26'
    view._end = '2026-11-22'

    await view._fetchEvents(0)

    const urls = view.appState.apiGet.mock.calls.map(
      ([url]) => new URL(url, 'https://example.test')
    )
    expect(urls).toHaveLength(2)
    expect(urls.map(url => url.searchParams.get('dates'))).toEqual([
      '*/10/*',
      '*/11/*',
    ])
    for (const url of urls) {
      expect(url.pathname).toBe('/api/events/')
      expect(url.searchParams.get('profile')).toBe('participants')
      expect(url.searchParams.get('keys')).toBe('date,handle,profile,type')
    }
    const rules = JSON.parse(urls[0].searchParams.get('rules'))
    expect(rules.rules[0].rules.map(rule => rule.values[0])).toEqual([
      'Birth',
      'Marriage',
      'Death',
    ])
  })

  it('lets a native HasType rule replace the default event types', async () => {
    const view = createView()
    view._eventRules = [
      {
        function: 'or',
        rules: [
          {name: 'HasType', values: ['Adoption']},
          {name: 'HasType', values: ['Baptism']},
        ],
      },
    ]

    await view._fetchEvents(0)

    const rules = JSON.parse(
      new URL(
        view.appState.apiGet.mock.calls[0][0],
        'https://example.test'
      ).searchParams.get('rules')
    )
    expect(JSON.stringify(rules)).toContain('Adoption')
    expect(JSON.stringify(rules)).not.toContain('Birth')
    expect(JSON.stringify(rules)).not.toContain('Marriage')
  })
})

describe('recurring occurrences from Gramps events', () => {
  it('converts exact event dates and excludes uncertain or ranged dates', () => {
    const occurrences = build([
      event({handle: 'exact', month: 3, day: 4}),
      event({handle: 'about', month: 3, day: 5, modifier: 3}),
      event({handle: 'ranged', month: 3, day: 6, modifier: 4}),
      event({handle: 'low-quality', month: 3, day: 7, quality: 1}),
    ])

    expect(occurrences.map(item => item.event.handle)).toEqual(['exact'])
    expect(occurrences[0].occurrence_date).toBe('2026-03-04')
  })

  it('places February 29 anniversaries on February 28 in non-leap years', () => {
    const occurrences = build([event({month: 2, day: 29, year: 2000})], {
      start: '2021-02-22',
      end: '2021-03-07',
    })

    expect(occurrences).toHaveLength(1)
    expect(occurrences[0].occurrence_date).toBe('2021-02-28')
    expect(occurrences[0].anniversary).toBe(21)
  })

  it('does not show an occurrence before the recorded historical year', () => {
    const occurrences = build([event({month: 4, day: 3, year: 2030})], {
      start: '2028-04-01',
      end: '2028-04-30',
    })

    expect(occurrences).toEqual([])
  })

  it('shows primary participants only', () => {
    const birth = event({participant: person('primary', 'I0001', 'Ada')})
    birth.profile.participants.people.push({
      role: 'Witness',
      person: person('witness', 'I0002', 'Bea'),
    })

    const occurrences = build([birth])

    expect(occurrences[0].participants.map(item => item.name)).toEqual(['Ada'])
  })
})

describe('anniversaries views', () => {
  afterEach(() => vi.useRealTimers())

  it('renders past dates in the list for a navigated window', () => {
    vi.useFakeTimers({now: new Date(2026, 2, 20)})
    const view = createView()
    view._data = build([event({month: 3, day: 4, year: 2001})], {
      start: '2026-03-02',
      end: '2026-03-29',
    })
    const container = document.createElement('div')
    render(view._renderList(), container)

    expect(container.querySelectorAll('.anniversary-row')).toHaveLength(1)
    expect(container.querySelector('a[href="/person/I0001"]')).not.toBeNull()
    expect(container.querySelector('.anniversary-row').textContent).toContain(
      '4/3/2001'
    )
  })

  it('highlights milestones and links grid entries to their participant', () => {
    const view = createView()
    view._start = '2026-03-02'
    view._end = '2026-03-29'
    view._data = build([event({month: 3, day: 4, year: 2001})], {
      start: view._start,
      end: view._end,
    })
    const container = document.createElement('div')
    render(view._renderGrid(), container)

    expect(
      container.querySelector('.event.milestone a[href="/person/I0001"]')
    ).not.toBeNull()
  })

  it('links family anniversaries to the family record in the grid', () => {
    const view = createView()
    view._start = '2026-03-02'
    view._end = '2026-03-29'
    view._data = build(
      [
        event({
          type: 'Marriage',
          month: 3,
          day: 4,
          year: 2001,
          family: {
            handle: 'family-1',
            gramps_id: 'F0001',
            father: person('father', 'I0001', 'Alex'),
            mother: person('mother', 'I0002', 'Sam'),
          },
        }),
      ],
      {start: view._start, end: view._end}
    )
    const container = document.createElement('div')
    render(view._renderGrid(), container)

    expect(
      container.querySelector('.event.milestone a[href="/family/F0001"]')
    ).not.toBeNull()
  })

  it('keeps the dashboard widget registered separately from the page', () => {
    expect(customElements.get('grampsjs-view-anniversaries')).toBe(
      GrampsjsViewAnniversaries
    )
    expect(customElements.get('grampsjs-view-anniversary-calendar')).toBe(
      GrampsjsViewAnniversaryCalendar
    )
    expect(new GrampsjsViewAnniversaries().active).toBe(true)
  })
})
