import {afterEach, describe, expect, it, vi} from 'vitest'

import {gregorianSdn} from '../../src/gcalendar.js'
import {
  buildAnniversaryOccurrences,
  GrampsjsViewAnniversaries,
} from '../../src/views/GrampsjsViewAnniversaries.js'

function createView() {
  const view = new GrampsjsViewAnniversaries()
  view.appState = {
    i18n: {lang: 'en', strings: {}},
    apiGet: vi.fn().mockResolvedValue({data: [], total_count: '0'}),
  }
  return view
}

function person(handle, grampsId = handle, name = handle) {
  return {handle, gramps_id: grampsId, name_display: name}
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
    eventTypes: ['Birth', 'Marriage', 'Death'],
    livingOnly: false,
    primaryOnly: true,
    allowedPeople: null,
    livingPeople: null,
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
})

describe('event collection', () => {
  it('uses the existing events collection with one month mask per month', async () => {
    const view = createView()
    view._start = '2026-10-26'
    view._end = '2026-11-22'
    view._requestSequence = 1

    await view._fetchEvents(1)

    const queries = view.appState.apiGet.mock.calls.map(
      ([url]) => new URL(url, 'https://example.test').searchParams
    )
    expect(queries).toHaveLength(2)
    expect(queries.map(query => query.get('dates'))).toEqual([
      '*/10/*',
      '*/11/*',
    ])
    expect(queries[0].get('profile')).toBe('participants')
    const rules = JSON.parse(queries[0].get('rules'))
    expect(rules.function).toBe('and')
    expect(rules.rules[0].function).toBe('or')
    expect(rules.rules[0].rules.map(rule => rule.values[0])).toEqual([
      'Birth',
      'Marriage',
      'Death',
    ])
  })

  it('uses Gramps ProbablyAlive rules for the living-only setting', async () => {
    vi.useFakeTimers({now: new Date(2026, 8, 24)})
    const view = createView()

    await view._load()

    const peopleQuery = view.appState.apiGet.mock.calls
      .map(([url]) => new URL(url, 'https://example.test'))
      .find(url => url.pathname === '/api/people/')
    expect(JSON.parse(peopleQuery.searchParams.get('rules'))).toEqual({
      function: 'and',
      rules: [{name: 'ProbablyAlive', values: ['2026-09-24']}],
    })
  })

  it('requires a type selection before requesting events', async () => {
    const view = createView()
    view._eventTypes = []

    await view._load()

    expect(view.appState.apiGet).not.toHaveBeenCalled()
    expect(view._error).toBe('Select at least one event type.')
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

  it('keeps deaths while requiring living people for births', () => {
    const occurrences = build(
      [
        event({handle: 'birth', type: 'Birth'}),
        event({handle: 'death', type: 'Death'}),
      ],
      {livingOnly: true, livingPeople: new Set()}
    )

    expect(occurrences.map(item => item.event.handle)).toEqual(['death'])
  })

  it('uses primary participants for living checks, not living witnesses', () => {
    const birth = event({
      type: 'Birth',
      handle: 'birth',
      participant: person('subject', 'I0001', 'Subject'),
    })
    birth.profile.participants.people.push({
      role: 'Witness',
      person: person('witness', 'I0002', 'Witness'),
    })

    const occurrences = build([birth], {
      livingOnly: true,
      livingPeople: new Set(['witness']),
    })

    expect(occurrences).toEqual([])
  })

  it('includes a marriage only when both spouses pass the person filter', () => {
    const marriage = event({
      type: 'Marriage',
      family: {
        handle: 'family-1',
        gramps_id: 'F0001',
        father: person('father', 'I0001', 'Alex Example'),
        mother: person('mother', 'I0002', 'Sam Example'),
      },
    })
    const bothLiving = build([marriage], {
      livingOnly: true,
      livingPeople: new Set(['father', 'mother']),
    })
    const oneLiving = build([marriage], {
      livingOnly: true,
      livingPeople: new Set(['father']),
    })

    expect(bothLiving).toHaveLength(1)
    expect(bothLiving[0].participants[0].object_type).toBe('family')
    expect(oneLiving).toEqual([])
  })

  it('intersects the results with selected people and filters secondary roles', () => {
    const occurrence = event({participant: person('selected', 'I0001', 'Ada')})
    const witness = event({
      handle: 'witness-event',
      participant: person('witness', 'I0002', 'Bea'),
      role: 'Witness',
    })
    const occurrences = build([occurrence, witness], {
      allowedPeople: new Set(['selected']),
    })

    expect(occurrences.map(item => item.event.handle)).toEqual(['event-1'])
  })

  it('matches a person filter against secondary participants but displays primary ones', () => {
    const selectedAsWitness = event({
      handle: 'selected-as-witness',
      participant: person('primary', 'I0001', 'Primary Person'),
    })
    selectedAsWitness.profile.participants.people.push({
      role: 'Witness',
      person: person('selected', 'I0002', 'Selected Person'),
    })

    const occurrences = build([selectedAsWitness], {
      allowedPeople: new Set(['selected']),
    })

    expect(occurrences).toHaveLength(1)
    expect(occurrences[0].participants.map(item => item.name)).toEqual([
      'Primary Person',
    ])
  })
})
