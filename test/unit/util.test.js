import {describe, it, expect} from 'vitest'
import {
  translate,
  personTitleFromProfile,
  personDisplayName,
  familyTitleFromProfile,
  citationTitleFromProfile,
  getSortval,
  arrayEqual,
  dateIsEmpty,
  getGregorianYears,
  isDateBetweenYears,
  makeHandle,
  normalizeRect,
  isValidRect,
  apiVersionAtLeast,
} from '../../src/util.js'

// Helpers
const makeDate = (year, month, day, modifier = 0, calendar = 0) => ({
  _class: 'Date',
  calendar,
  modifier,
  quality: 0,
  dateval: [day, month, year, false],
  sortval: 0,
})

const emptyDate = {
  _class: 'Date',
  calendar: 0,
  modifier: 0,
  quality: 0,
  dateval: [0, 0, 0, false],
  sortval: 0,
}

describe('translate', () => {
  const strings = {Hello: 'Hola', _Save: 'Guardar'}

  it('returns translation if key exists', () => {
    expect(translate(strings, 'Hello')).to.equal('Hola')
  })

  it('strips leading underscore', () => {
    expect(translate(strings, '_Save')).to.equal('Guardar')
  })

  it('returns key itself if not in strings', () => {
    expect(translate(strings, 'Unknown')).to.equal('Unknown')
  })

  it('returns empty string for undefined key', () => {
    expect(translate(strings, undefined)).to.equal('')
  })
})

describe('personTitleFromProfile', () => {
  it('combines given and surname', () => {
    expect(
      personTitleFromProfile({name_given: 'John', name_surname: 'Smith'})
    ).to.equal('John Smith')
  })

  it('uses ellipsis for missing given name', () => {
    expect(personTitleFromProfile({name_surname: 'Smith'})).to.equal('… Smith')
  })

  it('uses ellipsis for missing surname', () => {
    expect(personTitleFromProfile({name_given: 'John'})).to.equal('John …')
  })

  it('includes suffix', () => {
    expect(
      personTitleFromProfile({
        name_given: 'John',
        name_surname: 'Smith',
        name_suffix: 'Jr.',
      })
    ).to.equal('John Smith Jr.')
  })
})

describe('personDisplayName', () => {
  const person = {
    primary_name: {
      first_name: 'John',
      surname_list: [{prefix: '', surname: 'Smith', connector: ''}],
      suffix: '',
    },
  }

  it('given-first by default', () => {
    expect(personDisplayName(person)).to.equal('John Smith')
  })

  it('surname-first when option set', () => {
    expect(personDisplayName(person, {givenfirst: false})).to.equal(
      'Smith, John'
    )
  })

  it('handles missing primary_name gracefully', () => {
    expect(personDisplayName({})).to.equal('… …')
  })
})

describe('familyTitleFromProfile', () => {
  it('combines father and mother', () => {
    expect(
      familyTitleFromProfile({
        father: {name_given: 'John', name_surname: 'Smith'},
        mother: {name_given: 'Jane', name_surname: 'Doe'},
      })
    ).to.equal('John Smith & Jane Doe')
  })

  it('returns empty string when both missing', () => {
    expect(familyTitleFromProfile({})).to.equal('')
  })
})

describe('citationTitleFromProfile', () => {
  it('returns source title with page', () => {
    const result = citationTitleFromProfile({
      source: {title: 'Census 1900'},
      page: '42',
    })
    expect(result).to.include('Census 1900')
    expect(result).to.include('42')
  })

  it('returns empty string when no source title', () => {
    expect(citationTitleFromProfile({source: {}})).to.equal('')
  })
})

describe('getSortval', () => {
  it('returns 0 for all-zero date', () => {
    expect(getSortval(0, 0, 0)).to.equal(0)
  })

  it('returns a positive integer for a valid date', () => {
    const val = getSortval(2000, 1, 1)
    expect(val).to.be.a('number')
    expect(val).to.be.greaterThan(0)
  })

  it('later dates have higher sort values', () => {
    expect(getSortval(2000, 1, 2)).to.be.greaterThan(getSortval(2000, 1, 1))
    expect(getSortval(2001, 1, 1)).to.be.greaterThan(getSortval(2000, 1, 1))
  })
})

describe('arrayEqual', () => {
  it('returns true for arrays with the same elements', () => {
    expect(arrayEqual([1, 2, 3], [1, 2, 3])).to.be.true
  })

  it('returns true for arrays with the same elements in different order', () => {
    expect(arrayEqual([3, 1, 2], [1, 2, 3])).to.be.true
  })

  it('returns false when A is a strict subset of B', () => {
    expect(arrayEqual([1, 2], [1, 2, 3])).to.be.false
  })

  it('returns false when some elements of A are not in B', () => {
    expect(arrayEqual([1, 4], [1, 2, 3])).to.be.false
  })

  it('returns true for two empty arrays', () => {
    expect(arrayEqual([], [])).to.be.true
  })

  it('returns false for empty A', () => {
    expect(arrayEqual([], [1, 2, 3])).to.be.false
  })

  it('returns false for empty B', () => {
    expect(arrayEqual([1], [])).to.be.false
  })
})

describe('dateIsEmpty', () => {
  it('returns true for undefined', () => {
    expect(dateIsEmpty(undefined)).to.be.true
  })

  it('returns true for all-zero dateval', () => {
    expect(dateIsEmpty(emptyDate)).to.be.true
  })

  it('returns false for date with year', () => {
    expect(dateIsEmpty(makeDate(1900, 0, 0))).to.be.false
  })

  it('returns false for text-only modifier (6)', () => {
    expect(dateIsEmpty({...emptyDate, modifier: 6})).to.be.false
  })
})

describe('getGregorianYears', () => {
  it('returns [undefined, undefined] for empty date', () => {
    expect(getGregorianYears(emptyDate)).to.deep.equal([undefined, undefined])
  })

  it('returns the year for a simple Gregorian date', () => {
    expect(getGregorianYears(makeDate(1900, 6, 15))).to.deep.equal([1900, 1900])
  })

  it('adjusts for Hebrew calendar', () => {
    const [y] = getGregorianYears(makeDate(5784, 1, 1, 0, 2))
    expect(y).to.equal(5784 - 3760)
  })

  it('adjusts for Islamic calendar', () => {
    const [y] = getGregorianYears(makeDate(1445, 1, 1, 0, 5))
    expect(y).to.equal(Math.floor(0.97022 * 1445 + 621.565))
  })
})

describe('isDateBetweenYears', () => {
  it('returns true when year is within range', () => {
    expect(isDateBetweenYears(makeDate(1900, 1, 1), 1890, 1910)).to.be.true
  })

  it('returns false when year is outside range', () => {
    expect(isDateBetweenYears(makeDate(1800, 1, 1), 1890, 1910)).to.be.false
  })

  it('returns false for empty date', () => {
    expect(isDateBetweenYears(emptyDate, 1800, 2000)).to.be.false
  })

  it('returns false for undefined', () => {
    expect(isDateBetweenYears(undefined, 1800, 2000)).to.be.false
  })

  it('expands range for MOD_ABOUT (3)', () => {
    // year 1900 with RANGE_ABOUT=50 should match 1860-1950 range queries
    expect(isDateBetweenYears(makeDate(1900, 1, 1, 3), 1940, 1960)).to.be.true
    expect(isDateBetweenYears(makeDate(1900, 1, 1, 3), 1960, 1970)).to.be.false
  })
})

describe('makeHandle', () => {
  it('returns a string', () => {
    expect(makeHandle()).to.be.a('string')
  })

  it('returns a non-empty string', () => {
    expect(makeHandle().length).to.be.greaterThan(0)
  })

  it('returns unique values', () => {
    expect(makeHandle()).to.not.equal(makeHandle())
  })
})

describe('normalizeRect', () => {
  it('clamps negative coordinates to 0', () => {
    expect(normalizeRect([24, -11, 83, 98])).to.deep.equal([24, 0, 83, 98])
  })

  it('clamps coordinates above 100', () => {
    expect(normalizeRect([24, 11, 183, 198])).to.deep.equal([24, 11, 100, 100])
  })

  it('reorders inverted coordinates', () => {
    expect(normalizeRect([83, 98, 24, 11])).to.deep.equal([24, 11, 83, 98])
  })

  it('returns null for zero-area rectangles', () => {
    expect(normalizeRect([50, 50, 50, 60])).to.equal(null)
    expect(normalizeRect([50, 50, 60, 50])).to.equal(null)
  })

  it('returns null for malformed rectangles', () => {
    expect(normalizeRect([])).to.equal(null)
    expect(normalizeRect([1, 2, 3])).to.equal(null)
    expect(normalizeRect([1, 2, 3, 'x'])).to.equal(null)
  })

  it('keeps full-frame boundaries intact', () => {
    expect(normalizeRect([0, 0, 100, 100])).to.deep.equal([0, 0, 100, 100])
  })
})

describe('isValidRect', () => {
  it('returns true for valid rectangles', () => {
    expect(isValidRect([24, 0, 83, 98])).to.be.true
  })

  it('returns false for invalid rectangles', () => {
    expect(isValidRect([10, 10, 10, 20])).to.be.false
    expect(isValidRect([10, 10, 20, 10])).to.be.false
  })
})

describe('apiVersionAtLeast', () => {
  const dbInfo = v => ({gramps_webapi: {version: v}})

  it('returns false when version is missing', () => {
    expect(apiVersionAtLeast({}, 3, 9)).to.be.false
    expect(apiVersionAtLeast(undefined, 3, 9)).to.be.false
  })

  it('matches exact version', () => {
    expect(apiVersionAtLeast(dbInfo('3.9.0'), 3, 9, 0)).to.be.true
    expect(apiVersionAtLeast(dbInfo('3.9.1'), 3, 9, 1)).to.be.true
  })

  it('returns true for higher minor version', () => {
    expect(apiVersionAtLeast(dbInfo('3.10.0'), 3, 9)).to.be.true
  })

  it('returns false for lower minor version', () => {
    expect(apiVersionAtLeast(dbInfo('3.8.0'), 3, 9)).to.be.false
  })

  it('handles minor >= 10 correctly (no string comparison regression)', () => {
    expect(apiVersionAtLeast(dbInfo('3.10.0'), 3, 9)).to.be.true
    expect(apiVersionAtLeast(dbInfo('3.9.0'), 3, 10)).to.be.false
  })

  it('returns true for higher major version regardless of minor', () => {
    expect(apiVersionAtLeast(dbInfo('4.0.0'), 3, 9)).to.be.true
  })

  it('returns false for lower major version regardless of minor', () => {
    expect(apiVersionAtLeast(dbInfo('2.99.0'), 3, 9)).to.be.false
  })

  it('respects patch version', () => {
    expect(apiVersionAtLeast(dbInfo('3.9.1'), 3, 9, 2)).to.be.false
    expect(apiVersionAtLeast(dbInfo('3.9.2'), 3, 9, 2)).to.be.true
    expect(apiVersionAtLeast(dbInfo('3.9.3'), 3, 9, 2)).to.be.true
  })

  it('defaults patch to 0 when not specified', () => {
    expect(apiVersionAtLeast(dbInfo('3.9.0'), 3, 9)).to.be.true
  })
})
