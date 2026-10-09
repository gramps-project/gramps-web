import {describe, it, expect} from 'vitest'
import {render, html} from 'lit'
import {
  translate,
  objectDetail,
  personTitleFromProfile,
  personDisplayName,
  reportSelectItemLabel,
  reportSelectItemValue,
  familyTitleFromProfile,
  citationTitleFromProfile,
  eventTitleFromProfile,
  arrayEqual,
  dateIsEmpty,
  getGregorianYears,
  isDateBetweenYears,
  makeHandle,
  normalizeRect,
  isValidRect,
  getMediaRegions,
  addMediaRegion,
  replaceMediaRegion,
  removeMediaRegion,
  rectEqual,
  rectOverlap,
  modifyRect,
  apiVersionAtLeast,
  linkUrls,
  isKeyEventInInput,
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

  it('uses the configured text birth symbol in object detail', () => {
    const result = objectDetail(
      'person',
      {profile: {birth: {date: '1990', place: 'Paris'}}},
      {},
      {symbolSet: 'text'}
    )
    expect(result).to.include('b. 1990')
    expect(result).not.to.include('∗ 1990')
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

describe('reportSelectItemLabel', () => {
  it('returns the second tab-separated part as the label', () => {
    expect(reportSelectItemLabel('I0001\tStefańczyk, Maciej')).to.equal(
      'Stefańczyk, Maciej'
    )
  })

  it('returns the label for family options (trailing colon on value)', () => {
    expect(reportSelectItemLabel('F0058:\tSmith Family')).to.equal(
      'Smith Family'
    )
  })

  it('returns the single value as label for single-column options', () => {
    expect(reportSelectItemLabel('pdf\tPDF')).to.equal('PDF')
  })
})

describe('reportSelectItemValue', () => {
  it('returns the first column for simple key=value options', () => {
    expect(reportSelectItemValue('pdf\tPDF')).to.equal('pdf')
  })

  it('returns the first column (Gramps ID) for person options', () => {
    expect(reportSelectItemValue('I0001\tStefańczyk, Maciej')).to.equal('I0001')
  })

  it('strips trailing colon from value (family option Gramps internal format)', () => {
    expect(reportSelectItemValue('F0058:\tSmith Family')).to.equal('F0058')
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
    expect(
      citationTitleFromProfile({source: {title: 'Census 1900'}, page: '42'})
    ).to.equal('Census 1900 (42)')
  })

  it('returns source title without page', () => {
    expect(citationTitleFromProfile({source: {title: 'Census 1900'}})).to.equal(
      'Census 1900'
    )
  })

  it('returns empty string when no source title', () => {
    expect(citationTitleFromProfile({source: {}})).to.equal('')
  })
})

describe('eventTitleFromProfile', () => {
  it('returns summary with date', () => {
    expect(
      eventTitleFromProfile({summary: 'Birth of John', date: '1900'})
    ).to.equal('Birth of John (1900)')
  })

  it('returns summary without date if asked', () => {
    expect(
      eventTitleFromProfile({summary: 'Birth of John', date: '1900'}, false)
    ).to.equal('Birth of John')
  })

  it('returns empty string without summary', () => {
    expect(eventTitleFromProfile({date: '1900'})).to.equal('')
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

  it('returns true for an all-zero range', () => {
    expect(
      dateIsEmpty({
        ...emptyDate,
        modifier: 4,
        dateval: [0, 0, 0, false, 0, 0, 0, false],
      })
    ).to.be.true
  })

  it('returns false for a range with only the stop date set', () => {
    expect(
      dateIsEmpty({
        ...emptyDate,
        modifier: 4,
        dateval: [0, 0, 0, false, 15, 6, 1900, false],
      })
    ).to.be.false
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

describe('getMediaRegions', () => {
  const media = {
    handle: 'M1',
    extended: {
      backlinks: {
        person: [
          {
            handle: 'P1',
            gramps_id: 'I0001',
            media_list: [
              {ref: 'M1', rect: [0, 0, 10, 10]},
              {ref: 'M1', rect: [50, 50, 60, 60]},
              {ref: 'M2', rect: [1, 1, 2, 2]},
            ],
          },
        ],
        citation: [
          {
            handle: 'C1',
            gramps_id: 'C0001',
            media_list: [
              {ref: 'M1', rect: null},
              {ref: 'M1', rect: [20, 20, 40, 30]},
            ],
          },
        ],
      },
    },
    profile: {references: {citation: [{page: 'p. 4'}]}},
  }

  it('returns every region of the image, of any object type', () => {
    const regions = getMediaRegions(media)
    expect(regions.map(r => [r.type, r.handle, r.rect])).to.deep.equal([
      ['person', 'P1', [0, 0, 10, 10]],
      ['person', 'P1', [50, 50, 60, 60]],
      ['citation', 'C1', [20, 20, 40, 30]],
    ])
    expect(regions[2].grampsId).to.equal('C0001')
  })

  it('returns an empty list without backlinks', () => {
    expect(getMediaRegions({handle: 'M1'})).to.deep.equal([])
  })

  it('labels regions with plain text', () => {
    const regions = getMediaRegions({
      handle: 'M1',
      extended: {
        backlinks: {
          event: [
            {
              handle: 'E1',
              gramps_id: 'E0001',
              media_list: [{ref: 'M1', rect: [0, 0, 5, 5]}],
            },
          ],
          citation: [
            {
              handle: 'C1',
              gramps_id: 'C0001',
              media_list: [{ref: 'M1', rect: [0, 0, 5, 5]}],
            },
          ],
          family: [
            {
              handle: 'F1',
              gramps_id: 'F0001',
              media_list: [{ref: 'M1', rect: [0, 0, 5, 5]}],
            },
          ],
        },
      },
      profile: {
        references: {
          event: [{summary: 'Wedding of A and B', date: '1900-05-01'}],
          citation: [{source: {title: 'Parish book'}, page: 'p. 4'}],
          family: [{}],
        },
      },
    })
    expect(regions.map(r => r.label)).to.deep.equal([
      'Wedding of A and B (1900-05-01)',
      'Parish book (p. 4)',
      'F0001',
    ])
  })
})

describe('addMediaRegion', () => {
  it('appends a region next to existing references to the same image', () => {
    const list = [
      {ref: 'M1', rect: null},
      {ref: 'M1', rect: [0, 0, 10, 10]},
    ]
    expect(addMediaRegion(list, 'M1', [50, 50, 60, 60])).to.deep.equal([
      ...list,
      {ref: 'M1', rect: [50, 50, 60, 60]},
    ])
  })

  it('leaves the list unchanged when the region already exists', () => {
    const list = [{ref: 'M1', rect: [0, 0, 10, 10]}]
    expect(addMediaRegion(list, 'M1', [0, 0, 10, 10])).to.equal(list)
  })
})

describe('replaceMediaRegion', () => {
  it('moves only the matching region', () => {
    const list = [
      {ref: 'M1', rect: null},
      {ref: 'M1', rect: [0, 0, 10, 10], note_list: ['N1']},
      {ref: 'M1', rect: [50, 50, 60, 60]},
    ]
    expect(
      replaceMediaRegion(list, 'M1', [0, 0, 10, 10], [5, 5, 15, 15])
    ).to.deep.equal([
      list[0],
      {ref: 'M1', rect: [5, 5, 15, 15], note_list: ['N1']},
      list[2],
    ])
  })

  it('leaves the list unchanged when the region does not exist', () => {
    const list = [{ref: 'M1', rect: [0, 0, 10, 10]}]
    expect(replaceMediaRegion(list, 'M1', [1, 1, 2, 2], [3, 3, 4, 4])).to.equal(
      list
    )
  })
})

describe('removeMediaRegion', () => {
  it('keeps references to the whole image and to other regions', () => {
    const list = [
      {ref: 'M1', rect: null},
      {ref: 'M1', rect: [10, 20, 30, 40]},
      {ref: 'M1', rect: [20, 10, 40, 30]},
      {ref: 'M2', rect: [10, 20, 30, 40]},
    ]
    expect(removeMediaRegion(list, 'M1', [10, 20, 30, 40])).to.deep.equal([
      list[0],
      list[2],
      list[3],
    ])
  })
})

describe('rectEqual', () => {
  it('compares coordinates in order', () => {
    expect(rectEqual([10, 20, 30, 40], [10, 20, 30, 40])).to.be.true
    expect(rectEqual([10, 20, 30, 40], [20, 10, 40, 30])).to.be.false
    expect(rectEqual(null, [10, 20, 30, 40])).to.be.false
  })
})

describe('rectOverlap', () => {
  it('returns intersection over union', () => {
    expect(rectOverlap([0, 0, 10, 10], [0, 0, 10, 10])).to.equal(1)
    expect(rectOverlap([0, 0, 10, 10], [5, 0, 15, 10])).to.be.closeTo(
      1 / 3,
      1e-9
    )
    expect(rectOverlap([0, 0, 10, 10], [20, 20, 30, 30])).to.equal(0)
  })
})

describe('modifyRect', () => {
  it('moves a rectangle and keeps it inside the image', () => {
    expect(modifyRect([10, 10, 30, 20], 'move', 5.4, -3)).to.deep.equal([
      15, 7, 35, 17,
    ])
    expect(modifyRect([10, 10, 30, 20], 'move', 90, -50)).to.deep.equal([
      80, 0, 100, 10,
    ])
  })

  it('resizes a rectangle by a corner', () => {
    expect(modifyRect([10, 10, 30, 20], 'nw', -5, -5)).to.deep.equal([
      5, 5, 30, 20,
    ])
    expect(modifyRect([10, 10, 30, 20], 'se', 5, 5)).to.deep.equal([
      10, 10, 35, 25,
    ])
    expect(modifyRect([10, 10, 30, 20], 'ne', 200, -200)).to.deep.equal([
      10, 0, 100, 20,
    ])
  })

  it('keeps a resized rectangle at least 1 percent wide and high', () => {
    expect(modifyRect([10, 10, 30, 20], 'sw', 50, -50)).to.deep.equal([
      29, 10, 30, 11,
    ])
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

describe('linkUrls', () => {
  const link = url => `<a href="${url}" target="_blank">${url}</a>`

  it('links a bare https URL', () => {
    expect(linkUrls('https://example.com/x')).to.equal(
      link('https://example.com/x')
    )
  })

  it('links a bare http URL', () => {
    expect(linkUrls('http://example.com/x')).to.equal(
      link('http://example.com/x')
    )
  })

  it('keeps query string and fragment', () => {
    const url = 'https://example.com/p?q=1&r=2#frag'
    expect(linkUrls(url)).to.equal(link(url))
  })

  it('links a URL inside a text without touching the whitespace', () => {
    expect(linkUrls('a https://a.org/x b')).to.equal(
      `a ${link('https://a.org/x')} b`
    )
  })

  it('links several URLs in one text', () => {
    expect(linkUrls('a https://a.org/x b https://b.org/y c')).to.equal(
      `a ${link('https://a.org/x')} b ${link('https://b.org/y')} c`
    )
  })

  it('excludes trailing sentence punctuation', () => {
    expect(linkUrls('See https://a.org/x, then https://b.org/y.')).to.equal(
      `See ${link('https://a.org/x')}, then ${link('https://b.org/y')}.`
    )
  })

  it('includes balanced parentheses in the URL', () => {
    const url = 'https://wiki-de.genealogy.net/Dopp_(Haltern-Sythen)'
    expect(linkUrls(url)).to.equal(link(url))
  })

  it('includes parentheses in the middle of the URL', () => {
    const url = 'https://example.com/Foo_(bar)_baz'
    expect(linkUrls(url)).to.equal(link(url))
  })

  it('links a URL enclosed in parentheses', () => {
    expect(linkUrls('Found on Google (https://www.google.com)')).to.equal(
      `Found on Google (${link('https://www.google.com')})`
    )
  })

  it('links a parenthesized URL that itself contains parentheses', () => {
    const url = 'https://en.wikipedia.org/wiki/Foo_(bar)'
    expect(linkUrls(`(${url})`)).to.equal(`(${link(url)})`)
  })

  it('links a URL preceded by a line break', () => {
    expect(linkUrls('line\nhttps://a.org/x\nmore')).to.equal(
      `line\n${link('https://a.org/x')}\nmore`
    )
  })

  it('ignores schemes other than http and https', () => {
    expect(linkUrls('ftp://example.com/x')).to.equal('ftp://example.com/x')
    expect(linkUrls('www.example.com')).to.equal('www.example.com')
  })

  it('ignores a URL glued to preceding text', () => {
    const text = 'mailto:x@https://example.com'
    expect(linkUrls(text)).to.equal(text)
  })

  it('returns text without URLs unchanged', () => {
    expect(linkUrls('no urls here')).to.equal('no urls here')
    expect(linkUrls('')).to.equal('')
  })

  it('renders anchors as a template result when textOnly is false', () => {
    const div = document.createElement('div')
    render(html`${linkUrls('see (https://a.org/x) now', false)}`, div)
    const anchors = div.querySelectorAll('a')
    expect(anchors.length).to.equal(1)
    expect(anchors[0].getAttribute('href')).to.equal('https://a.org/x')
    expect(div.textContent).to.contain('now')
  })
})

describe('isKeyEventInInput', () => {
  const keyEvent = path => ({composedPath: () => path})
  const element = tagName => ({tagName})

  it('leaves keys to text fields, dialogs, selects and menus', () => {
    const paths = [
      [element('INPUT')],
      [element('TEXTAREA')],
      [element('OPTION')],
      [element('MD-DIALOG')],
      // A select and a menu are entered through the elements inside them
      [element('LI'), element('MD-FILLED-SELECT')],
      [element('LI'), element('MD-MENU')],
    ]
    paths.forEach(path =>
      expect(isKeyEventInInput(keyEvent(path))).to.equal(true)
    )
  })

  it('leaves keys alone elsewhere', () => {
    expect(isKeyEventInInput(keyEvent([element('BODY')]))).to.equal(false)
    expect(
      isKeyEventInInput(keyEvent([element('A'), element('MD-LIST')]))
    ).to.equal(false)
  })
})
