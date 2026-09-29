import {describe, it, expect} from 'vitest'

import {
  countEventTypes,
  eventMatches,
  eventTypeKey,
  filterPlaces,
  yearRange,
} from '../../src/mapFilters.js'

// A Gramps date object for 1 January of the given year.
const date = year => ({
  calendar: 0,
  modifier: 0,
  quality: 0,
  dateval: [1, 1, year, false],
  sortval: 1,
  text: '',
})

describe('eventTypeKey', () => {
  it('accepts strings and type objects', () => {
    expect(eventTypeKey('Birth')).to.equal('Birth')
    expect(eventTypeKey({string: 'Birth'})).to.equal('Birth')
    expect(eventTypeKey(undefined)).to.equal('')
  })

  it('names standard types given by their numeric value', () => {
    expect(eventTypeKey({string: '', value: 12})).to.equal('Birth')
    expect(eventTypeKey({value: 0})).to.equal('Custom')
  })
})

describe('yearRange', () => {
  it('spans the year in both directions while enabled', () => {
    expect(yearRange(1900, 25, true)).to.deep.equal({min: 1875, max: 1925})
  })

  it('is null while disabled or without a year', () => {
    expect(yearRange(1900, 25, false)).to.equal(null)
    expect(yearRange(-1, 25, true)).to.equal(null)
  })
})

describe('eventMatches', () => {
  const event = {type: 'Birth', date: date(1900)}

  it('matches without filters', () => {
    expect(eventMatches(event, {years: null, eventTypes: new Set()})).to.equal(
      true
    )
  })

  it('checks years and type together', () => {
    const years = {min: 1890, max: 1910}
    expect(
      eventMatches(event, {years, eventTypes: new Set(['Birth'])})
    ).to.equal(true)
    expect(
      eventMatches(event, {years, eventTypes: new Set(['Death'])})
    ).to.equal(false)
    expect(
      eventMatches(event, {
        years: {min: 1950, max: 1960},
        eventTypes: new Set(),
      })
    ).to.equal(false)
  })
})

describe('filterPlaces', () => {
  const places = [{handle: 'P1'}, {handle: 'P2'}]
  const eventsByPlace = new Map([['P1', [{type: 'Birth', date: date(1900)}]]])

  it('returns all places, including those without events, without filters', () => {
    expect(
      filterPlaces(places, eventsByPlace, {years: null, eventTypes: []})
    ).to.equal(places)
  })

  it('drops places without a matching event', () => {
    expect(
      filterPlaces(places, eventsByPlace, {
        years: null,
        eventTypes: ['Birth'],
      }).map(p => p.handle)
    ).to.deep.equal(['P1'])
  })
})

describe('countEventTypes', () => {
  it('counts types, most frequent first, then by name', () => {
    expect(
      countEventTypes([
        {type: 'Death'},
        {type: 'Birth'},
        {type: 'Birth'},
        {type: 'Census'},
        {type: ''},
      ])
    ).to.deep.equal([
      {type: 'Birth', count: 2},
      {type: 'Census', count: 1},
      {type: 'Death', count: 1},
    ])
  })
})
