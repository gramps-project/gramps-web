import {describe, it, expect} from 'vitest'
import {getDateFormat, toDate, withDateFormat} from '../../src/date.js'

describe('toDate', () => {
  it('formats a normal date', () => {
    expect(toDate([15, 6, 1985])).to.equal('1985-6-15')
  })

  it('formats day/month zero (year only)', () => {
    expect(toDate([0, 0, 1900])).to.equal('1900-0-0')
  })

  it('returns empty string for undefined', () => {
    expect(toDate(undefined)).to.equal('')
  })

  it('returns empty string for null', () => {
    expect(toDate(null)).to.equal('')
  })

  it('returns empty string for empty array', () => {
    expect(toDate([])).to.equal('undefined-undefined-undefined')
  })
})

describe('getDateFormat', () => {
  it('uses the padded German format by default', () => {
    expect(getDateFormat({lang: 'de'})).to.equal(6)
    expect(getDateFormat({lang: 'de_AT'})).to.equal(6)
  })

  it('respects a saved format or server-default choice', () => {
    expect(getDateFormat({lang: 'de', dateFormat: 0})).to.equal(0)
    expect(getDateFormat({lang: 'de', dateFormat: null})).to.equal(null)
  })
})

describe('withDateFormat', () => {
  it('adds the German format to endpoints with localized date profiles', () => {
    const format = getDateFormat({lang: 'de'})
    expect(withDateFormat('/api/people/?profile=all', format, 'de')).to.equal(
      '/api/people/?profile=all&locale=de&date_format=6'
    )
  })

  it('adds the format to timeline and search endpoints', () => {
    expect(withDateFormat('/api/people/handle/timeline?locale=de', 6)).to.equal(
      '/api/people/handle/timeline?locale=de&date_format=6'
    )
    expect(withDateFormat('/api/search/?query=smith', 6)).to.equal(
      '/api/search/?query=smith&date_format=6'
    )
  })

  it('does not alter endpoints that do not support date formatting', () => {
    expect(withDateFormat('/api/people/handle/dna/matches', 6)).to.equal(
      '/api/people/handle/dna/matches'
    )
    expect(withDateFormat('/api/places/coordinates/', 6)).to.equal(
      '/api/places/coordinates/'
    )
    expect(withDateFormat('/api/metadata/', 6)).to.equal('/api/metadata/')
  })

  it('leaves invalid or unset formats unchanged', () => {
    expect(withDateFormat('/api/people/', null)).to.equal('/api/people/')
    expect(withDateFormat('/api/people/', -1)).to.equal('/api/people/')
  })

  it('uses the selected locale when the endpoint does not include one', () => {
    expect(withDateFormat('/api/people/?profile=all', null, 'de')).to.equal(
      '/api/people/?profile=all&locale=de'
    )
  })
})
