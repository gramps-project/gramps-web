import {describe, it, expect} from 'vitest'

import {
  WIKIDATA_BUILDINGS_LIMIT,
  buildBuildingsQuery,
  containsBounds,
  formatWikidataTime,
  formatWikidataTimeRange,
  getCommonsThumbnailUrl,
  padBounds,
  parseBuildingDetail,
  parseBuildings,
  parseWktPoint,
  qidFromUri,
  wikidataLanguages,
  wikidataYear,
} from '../../src/wikidata.ts'

const uri = qid => ({value: `http://www.wikidata.org/entity/${qid}`})
const literal = value => ({value})

describe('padBounds and containsBounds', () => {
  const viewport = {west: 8, south: 49, east: 9, north: 50}

  it('pads every side by a fraction of the size', () => {
    expect(padBounds(viewport, 0.25)).to.deep.equal({
      west: 7.75,
      south: 48.75,
      east: 9.25,
      north: 50.25,
    })
  })

  it('contains a viewport moved within the padding', () => {
    const padded = padBounds(viewport, 0.25)
    const moved = {west: 8.2, south: 49.2, east: 9.2, north: 50.2}
    expect(containsBounds(padded, moved)).to.equal(true)
  })

  it('does not contain a viewport that leaves it', () => {
    const moved = {west: 8.5, south: 49, east: 9.5, north: 50}
    expect(containsBounds(viewport, moved)).to.equal(false)
  })
})

describe('wikidataYear', () => {
  it('reads the year of a dateTime literal', () => {
    expect(wikidataYear('1650-01-01T00:00:00Z')).to.equal(1650)
  })

  it('reads years before the common era', () => {
    expect(wikidataYear('-0500-01-01T00:00:00Z')).to.equal(-500)
  })

  it('returns null for unknown values and missing input', () => {
    expect(
      wikidataYear('http://www.wikidata.org/.well-known/genid/abc')
    ).to.equal(null)
    expect(wikidataYear(undefined)).to.equal(null)
  })
})

describe('parseWktPoint', () => {
  it('reads longitude first, as in WKT', () => {
    expect(parseWktPoint('Point(8.7158 49.4106)')).to.deep.equal({
      lat: 49.4106,
      long: 8.7158,
    })
  })

  it('returns null for anything else', () => {
    expect(parseWktPoint('Polygon((0 0))')).to.equal(null)
    expect(parseWktPoint(undefined)).to.equal(null)
  })
})

describe('qidFromUri', () => {
  it('extracts the QID of an entity URI', () => {
    expect(qidFromUri('http://www.wikidata.org/entity/Q327265')).to.equal(
      'Q327265'
    )
  })

  it('returns null for other URIs', () => {
    expect(qidFromUri('http://www.wikidata.org/prop/P31')).to.equal(null)
  })
})

describe('wikidataLanguages', () => {
  it('adds the base language and the fallbacks', () => {
    expect(wikidataLanguages('pt_BR')).to.equal('pt-br,pt,en,mul')
  })

  it('does not repeat English', () => {
    expect(wikidataLanguages('en')).to.equal('en,mul')
  })
})

describe('buildBuildingsQuery', () => {
  const query = buildBuildingsQuery(
    {west: 8.68, south: 49.405, east: 8.72, north: 49.42},
    'de'
  )

  it('queries the bounding box corners', () => {
    expect(query).to.contain('"Point(8.680000 49.405000)"')
    expect(query).to.contain('"Point(8.720000 49.420000)"')
  })

  it('walks two subclass steps and includes the farm types', () => {
    expect(query).to.contain('?type wdt:P279?/wdt:P279? ?r')
    expect(query).to.contain('wd:Q131596')
    expect(query).to.contain('wd:Q41176')
    expect(query).to.contain('?r wdt:P31 wd:Q811102')
  })

  it('limits the number of buildings in the named subquery', () => {
    expect(query).to.contain(`LIMIT ${WIKIDATA_BUILDINGS_LIMIT}`)
    expect(query).to.contain('INCLUDE %buildings')
  })

  it('asks for labels in the given language first', () => {
    expect(query).to.contain('wikibase:language "de,en,mul"')
  })
})

describe('parseBuildings', () => {
  it('parses rows and keeps the first row per building', () => {
    const buildings = parseBuildings({
      results: {
        bindings: [
          {
            item: uri('Q1'),
            itemLabel: literal('Old house'),
            coord: literal('Point(8.7 49.4)'),
            inception: literal('1650-01-01T00:00:00Z'),
            demolished: literal('1900-01-01T00:00:00Z'),
          },
          {
            item: uri('Q1'),
            itemLabel: literal('Old house'),
            coord: literal('Point(8.8 49.5)'),
          },
          {item: uri('Q2'), coord: literal('Point(8.9 49.6)')},
        ],
      },
    })
    expect(buildings).to.deep.equal([
      {
        qid: 'Q1',
        label: 'Old house',
        lat: 49.4,
        long: 8.7,
        inceptionYear: 1650,
        demolishedYear: 1900,
      },
      {
        qid: 'Q2',
        label: 'Q2',
        lat: 49.6,
        long: 8.9,
        inceptionYear: null,
        demolishedYear: null,
      },
    ])
  })

  it('skips rows without coordinates', () => {
    expect(
      parseBuildings({results: {bindings: [{item: uri('Q1')}]}})
    ).to.deep.equal([])
  })

  it('handles an empty response', () => {
    expect(parseBuildings({})).to.deep.equal([])
  })
})

describe('parseBuildingDetail', () => {
  const detail = parseBuildingDetail({
    results: {
      bindings: [
        {
          itemLabel: literal('Heidelberger Schloss'),
          itemDescription: literal('Schloss in Deutschland'),
        },
        {typeLabel: literal('Burg')},
        {typeLabel: literal('Museum')},
        {
          image: literal(
            'http://commons.wikimedia.org/wiki/Special:FilePath/A.jpg'
          ),
        },
        {
          inceptionTime: literal('1214-01-01T00:00:00Z'),
          inceptionPrec: literal('9'),
        },
        {
          occupant: uri('Q20'),
          occupantLabel: literal('Later resident'),
          occupantStartTime: literal('1800-01-01T00:00:00Z'),
          occupantStartPrec: literal('9'),
        },
        {
          occupant: uri('Q10'),
          occupantLabel: literal('Early resident'),
          occupantStartTime: literal('1700-01-01T00:00:00Z'),
          occupantStartPrec: literal('9'),
          occupantEndTime: literal('1750-01-01T00:00:00Z'),
          occupantEndPrec: literal('9'),
        },
        {
          occupant: uri('Q10'),
          occupantLabel: literal('Early resident'),
          occupantStartTime: literal('1700-01-01T00:00:00Z'),
          occupantStartPrec: literal('9'),
          occupantEndTime: literal('1750-01-01T00:00:00Z'),
          occupantEndPrec: literal('9'),
        },
        {owner: uri('Q30'), ownerLabel: literal('State')},
        {address: literal('Schlosshof 1')},
        {govId: literal('object_123')},
      ],
    },
  })

  it('collects the single-valued fields', () => {
    expect(detail.label).to.equal('Heidelberger Schloss')
    expect(detail.description).to.equal('Schloss in Deutschland')
    expect(detail.types).to.deep.equal(['Burg', 'Museum'])
    expect(detail.image).to.contain('Special:FilePath/A.jpg')
    expect(detail.inception).to.deep.equal({
      time: '1214-01-01T00:00:00Z',
      precision: 9,
    })
    expect(detail.demolished).to.equal(null)
    expect(detail.govId).to.equal('object_123')
  })

  it('deduplicates occupants and sorts them by start', () => {
    expect(detail.occupants.map(o => o.qid)).to.deep.equal(['Q10', 'Q20'])
    expect(detail.occupants[0].end.time).to.equal('1750-01-01T00:00:00Z')
  })

  it('keeps owners and addresses', () => {
    expect(detail.owners).to.deep.equal([
      {qid: 'Q30', label: 'State', start: null, end: null},
    ])
    expect(detail.addresses).to.deep.equal([
      {label: 'Schlosshof 1', start: null, end: null},
    ])
  })
})

describe('formatWikidataTime', () => {
  it('shows a year for year precision and coarser', () => {
    expect(
      formatWikidataTime({time: '1650-01-01T00:00:00Z', precision: 9})
    ).to.equal('1650')
    expect(
      formatWikidataTime({time: '1600-01-01T00:00:00Z', precision: 7})
    ).to.equal('1600')
  })

  it('shows month and day when they are known', () => {
    expect(
      formatWikidataTime({time: '1650-03-01T00:00:00Z', precision: 10}, 'en')
    ).to.equal('March 1650')
    expect(
      formatWikidataTime({time: '1650-03-15T00:00:00Z', precision: 11}, 'en')
    ).to.equal('March 15, 1650')
  })

  it('ignores a zero day with month precision', () => {
    expect(
      formatWikidataTime({time: '1650-03-00T00:00:00Z', precision: 10}, 'en')
    ).to.equal('March 1650')
  })

  it('returns an empty string without a value', () => {
    expect(formatWikidataTime(null)).to.equal('')
  })
})

describe('formatWikidataTimeRange', () => {
  const t1 = {time: '1700-01-01T00:00:00Z', precision: 9}
  const t2 = {time: '1750-01-01T00:00:00Z', precision: 9}

  it('formats open and closed ranges', () => {
    expect(formatWikidataTimeRange(t1, t2)).to.equal('1700–1750')
    expect(formatWikidataTimeRange(t1, null)).to.equal('1700–')
    expect(formatWikidataTimeRange(null, t2)).to.equal('–1750')
    expect(formatWikidataTimeRange(null, null)).to.equal('')
  })
})

describe('getCommonsThumbnailUrl', () => {
  it('uses https and requests a width', () => {
    expect(
      getCommonsThumbnailUrl(
        'http://commons.wikimedia.org/wiki/Special:FilePath/A.jpg'
      )
    ).to.equal(
      'https://commons.wikimedia.org/wiki/Special:FilePath/A.jpg?width=400'
    )
  })
})
