import {describe, it, expect, vi} from 'vitest'
import {render} from 'lit'

import {
  RELATIONSHIP_CLASSES,
  autosomalLengths,
  checkTreeRelationship,
  degreeOf,
  estimateRelationship,
  expectedSegments,
  formatLikelihoodRatio,
  logLikelihood,
  matchRelationshipEstimate,
  supportsRelationshipEstimate,
  autosomalCoverage,
  sharedPercent,
  groupLabel,
  conflictWarning,
  PARENT_CHILD,
  FULL_SIBLING,
} from '../../src/dnaRelationship.js'
import {GrampsjsDnaMatches} from '../../src/components/GrampsjsDnaMatches.js'
import {GrampsjsDnaMatch} from '../../src/components/GrampsjsDnaMatch.js'
import {GrampsjsViewDnaMatches} from '../../src/views/GrampsjsViewDnaMatches.js'
import {GrampsjsTable} from '../../src/components/GrampsjsTable.js'
import {
  chromosomeOrder,
  segmentsCsv,
  sortSegments,
} from '../../src/components/GrampsjsDnaMatchTable.js'
import {GrampsjsDownloadButton} from '../../src/components/GrampsjsDownloadButton.js'

const segments = lengths =>
  lengths.map((cM, i) => ({chromosome: String(1 + (i % 22)), cM}))

// About 840 cM in 25 segments, typical for first cousins
const FIRST_COUSINS = segments([
  80, 70, 62, 55, 50, 48, 45, 42, 40, 38, 35, 33, 30, 28, 26, 25, 22, 20, 18,
  16, 15, 13, 12, 10, 9,
])

// About 1,740 cM in 32 segments, typical for an aunt and her niece
const AUNT_NIECE = segments(
  Array.from({length: 32}, (_, i) => Math.max(8, 117 * Math.exp((-3 * i) / 32)))
)

describe('relationship classes', () => {
  it('leaves out parent/child and full siblings', () => {
    const keys = RELATIONSHIP_CLASSES.map(({d, a}) => `${d},${a}`)
    expect(keys).not.toContain('1,1')
    expect(keys).not.toContain('2,2')
    expect(keys).toContain('2,1')
    expect(keys).toContain('3,2')
  })

  it('counts degrees genetically', () => {
    expect(degreeOf(2, 1)).toBe(2) // half siblings
    expect(degreeOf(3, 2)).toBe(2) // aunt and niece
    expect(degreeOf(4, 2)).toBe(3) // first cousins
    expect(degreeOf(6, 2)).toBe(5) // second cousins
  })
})

describe('autosomalLengths', () => {
  it('keeps positive lengths on autosomes only', () => {
    const lengths = autosomalLengths([
      {chromosome: 'chr1', cM: 20},
      {chromosome: 'X', cM: 30},
      {chromosome: '23', cM: 30},
      {chromosome: 22, cM: 10},
      {chromosome: '3', cM: 0},
      {chromosome: '4'},
    ])
    expect(lengths).toEqual([20, 10])
  })
})

describe('ERSA model', () => {
  it('computes the expected segment count of Huff et al.', () => {
    // a (r d + c) / 2^(d - 1) for first cousins without a threshold
    expect(expectedSegments(4, 2, 0)).toBeCloseTo((2 * (35.3 * 4 + 22)) / 8)
    expect(expectedSegments(4, 2, 10)).toBeCloseTo(
      ((2 * (35.3 * 4 + 22)) / 8) * Math.exp(-0.4)
    )
  })

  it('adds a Poisson count and exponential lengths', () => {
    const lambda = expectedSegments(4, 2, 7)
    const expected =
      2 * Math.log(lambda) -
      lambda -
      Math.log(2) +
      2 * Math.log(0.04) -
      0.04 * (13 + 3)
    expect(logLikelihood([20, 10], 7, 4, 2)).toBeCloseTo(expected)
  })
})

describe('estimateRelationship', () => {
  it('returns null without autosomal segments', () => {
    expect(estimateRelationship([])).toBeNull()
    expect(estimateRelationship([{chromosome: 'X', cM: 40}])).toBeNull()
  })

  it('gives probabilities that sum to one, most probable first', () => {
    const {groups} = estimateRelationship(FIRST_COUSINS)
    const total = groups.reduce((sum, {probability}) => sum + probability, 0)
    expect(total).toBeCloseTo(1)
    const probabilities = groups.map(({probability}) => probability)
    expect(probabilities).toEqual([...probabilities].sort((x, y) => y - x))
  })

  it('lowers the threshold to the shortest segment', () => {
    expect(estimateRelationship(segments([20, 5])).threshold).toBe(5)
    expect(estimateRelationship(segments([20, 9])).threshold).toBe(7)
  })

  it('recognizes first cousins', () => {
    expect(estimateRelationship(FIRST_COUSINS).groups[0].group).toBe(3)
  })

  it('groups very distant degrees', () => {
    const {groups} = estimateRelationship(segments([7.5]))
    const degrees = groups.map(({group}) => group).filter(Number.isInteger)
    expect(Math.max(...degrees)).toBe(9)
  })
})

describe('checkTreeRelationship', () => {
  const estimate = estimateRelationship(FIRST_COUSINS)

  it('flags first cousins recorded as second cousins', () => {
    const check = checkTreeRelationship(estimate, 6, 2)
    expect(check.group).toBe(5)
    expect(check.conflict).toBe(true)
    expect(check.ratio).toBeLessThan(1e-3)
  })

  it('accepts first cousins recorded as first cousins', () => {
    const check = checkTreeRelationship(estimate, 4, 2)
    expect(check.conflict).toBe(false)
    expect(check.ratio).toBeGreaterThan(0.5)
  })

  it('compares degrees, so an aunt is not flagged as a half sibling', () => {
    const auntEstimate = estimateRelationship(AUNT_NIECE)
    expect(checkTreeRelationship(auntEstimate, 3, 2).conflict).toBe(false)
  })

  it('skips parent and child without segment positions', () => {
    expect(checkTreeRelationship(estimate, 1, 1)).toBeNull()
  })

  it('does not check without an estimate', () => {
    expect(checkTreeRelationship(null, 4, 2)).toBeNull()
  })
})

describe('matchRelationshipEstimate', () => {
  const match = {
    segments: FIRST_COUSINS,
    relation: 'second cousin',
    distance: 6,
    ancestor_handles: ['a1', 'a2'],
  }

  it('checks the tree relationship with both common ancestors', () => {
    const {check} = matchRelationshipEstimate(match)
    expect(check.group).toBe(5)
    expect(check.conflict).toBe(true)
  })

  it('counts a single common ancestor as a half relationship', () => {
    const {check} = matchRelationshipEstimate({
      ...match,
      ancestor_handles: ['a1'],
    })
    expect(check.group).toBe(6)
  })

  it('counts an ancestor listed twice once', () => {
    const {check} = matchRelationshipEstimate({
      ...match,
      ancestor_handles: ['a1', 'a1'],
    })
    expect(check.group).toBe(6)
  })

  it('skips the check without a tree relationship', () => {
    expect(
      matchRelationshipEstimate({...match, distance: null}).check
    ).toBeNull()
    expect(
      matchRelationshipEstimate({...match, distance: undefined}).check
    ).toBeNull()
  })
})

describe('supportsRelationshipEstimate', () => {
  const dbInfo = version => ({gramps_webapi: {version}})

  it('needs Gramps Web API 3.26', () => {
    expect(supportsRelationshipEstimate(dbInfo('3.26.0'))).toBe(true)
    expect(supportsRelationshipEstimate(dbInfo('4.0.0'))).toBe(true)
    expect(supportsRelationshipEstimate(dbInfo('3.25.3'))).toBe(false)
    expect(supportsRelationshipEstimate(undefined)).toBe(false)
  })
})

describe('formatLikelihoodRatio', () => {
  it('rounds to two significant digits', () => {
    expect(formatLikelihoodRatio(1 / 3456, 'en')).toBe('1 : 3,500')
    expect(formatLikelihoodRatio(1 / 3456, 'de')).toBe('1 : 3.500')
  })
})

describe('GrampsjsDnaMatches relationship column', () => {
  const element = (version = '3.26.0') => {
    const el = new GrampsjsDnaMatches()
    el.appState = {
      i18n: {strings: {}, lang: 'en'},
      dbInfo: {gramps_webapi: {version}},
    }
    return el
  }
  const relationshipCell = (match, version) =>
    element(version)._computeTableData([{handle: 'm1', ...match}])[0][1]

  it('estimates the relationship of a match not in the tree', () => {
    const cell = relationshipCell({segments: FIRST_COUSINS, relation: ''})
    expect(cell.estimated).toBe(true)
    expect(cell.text).toBe('Relative of degree 3')
  })

  it('shows the tree relationship with a warning if the DNA does not fit', () => {
    const cell = relationshipCell({
      segments: FIRST_COUSINS,
      relation: 'second cousin',
      distance: 6,
      ancestor_handles: ['a1', 'a2'],
    })
    expect(cell.estimated).toBe(false)
    expect(cell.text).toBe('second cousin')
    expect(cell.warning).toContain('is unlikely for the relationship')
    expect(cell.warning).toContain('(1 :')
  })

  it('shows the tree relationship without a warning if the DNA fits', () => {
    const cell = relationshipCell({
      segments: FIRST_COUSINS,
      relation: 'first cousin',
      distance: 4,
      ancestor_handles: ['a1', 'a2'],
    })
    expect(cell.warning).toBe('')
  })

  it('shows Unknown without segments or relationship', () => {
    expect(relationshipCell({segments: [], relation: ''})).toBe('Unknown')
  })

  it('shows only the tree relationship with an older backend', () => {
    expect(
      relationshipCell({segments: FIRST_COUSINS, relation: ''}, '3.25.3')
    ).toBe('Unknown')
    expect(
      relationshipCell({segments: FIRST_COUSINS, relation: 'cousin'}, '3.25.3')
    ).toBe('cousin')
  })

  it('has no extra column', () => {
    expect(element()._columns).toHaveLength(5)
  })

  it('sorts by the displayed text', () => {
    const column = element()._columns[1]
    expect(column.sortValue('Unknown')).toBe('Unknown')
    expect(column.sortValue({text: 'First cousin'})).toBe('First cousin')
  })
})

describe('GrampsjsTable sortValue', () => {
  it('sorts by the value the column derives', () => {
    const table = new GrampsjsTable()
    table.columns = [{name: 'A', sortValue: value => value.key}]
    table.data = [[{key: 2}], [{key: 1}]]
    table.sortable = true
    table.sort = 0
    expect(table._sortedRows().map(({index}) => index)).toEqual([1, 0])
  })
})

describe('GrampsjsDnaMatch estimate section', () => {
  const element = version => {
    const el = new GrampsjsDnaMatch()
    el.appState = {
      i18n: {strings: {}, lang: 'en'},
      dbInfo: {gramps_webapi: {version}},
    }
    el.data = {segments: FIRST_COUSINS, relation: ''}
    return el
  }

  it('renders with Gramps Web API 3.26', () => {
    expect(element('3.26.0')._renderEstimate()).not.toBe('')
  })

  it('is hidden with an older backend', () => {
    expect(element('3.25.3')._renderEstimate()).toBe('')
  })

  const renderSection = el => {
    const root = document.createElement('div')
    render(el._renderEstimate(), root)
    return root
  }

  it('lists the most probable relationship first', () => {
    const first = renderSection(element('3.26.0')).querySelector('tbody tr')
    expect(first.classList.contains('first')).toBe(true)
    expect(first.textContent).toContain('Relative of degree 3')
  })

  it('lists four relationships until Show more is clicked', () => {
    const el = element('3.26.0')
    // five degrees above 1 %
    el.data = {segments: segments([30, 20, 12]), relation: ''}
    let root = renderSection(el)
    expect(root.querySelectorAll('tbody tr')).toHaveLength(4)
    expect(root.querySelector('.more').textContent).toContain('Show more')
    el._showAllGroups = true
    root = renderSection(el)
    expect(root.querySelectorAll('tbody tr')).toHaveLength(5)
  })
})

// Segments that cover `fraction` of every autosome, in two pieces per
// autosome, with positions in base pairs
const CHROMOSOME_CM = [
  286, 269, 223, 214, 204, 193, 187, 170, 169, 180, 159, 175, 126, 119, 141,
  134, 128, 118, 108, 108, 62, 73,
]
const CHROMOSOME_BP = [
  249250621, 243199373, 198022430, 191154276, 180915260, 171115067, 159138663,
  146364022, 141213431, 135534747, 135006516, 133851895, 115169878, 107349540,
  102531392, 90354753, 81195210, 78077248, 59128983, 63025520, 48129895,
  51304566,
]
const covering = fraction =>
  CHROMOSOME_CM.flatMap((cM, i) => {
    const bp = CHROMOSOME_BP[i] * fraction
    return [
      {
        chromosome: String(i + 1),
        start: 0,
        stop: bp / 2,
        cM: (cM * fraction) / 2,
      },
      {
        chromosome: String(i + 1),
        start: CHROMOSOME_BP[i] - bp / 2,
        stop: CHROMOSOME_BP[i],
        cM: (cM * fraction) / 2,
      },
    ]
  })

describe('coverage', () => {
  it('is the shared fraction of the autosomes in base pairs', () => {
    expect(autosomalCoverage(covering(0.5))).toBeCloseTo(0.5)
    expect(sharedPercent(covering(0.5))).toBeCloseTo(0.25)
  })

  it('is unknown without segment positions', () => {
    expect(autosomalCoverage(FIRST_COUSINS)).toBeNull()
    expect(sharedPercent(FIRST_COUSINS)).toBeNull()
  })

  it('is unknown with blank, zero or reversed positions', () => {
    const segment = {chromosome: '1', start: 1000, stop: 2000000, cM: 20}
    expect(autosomalCoverage([segment])).not.toBeNull()
    for (const positions of [
      {start: null, stop: null},
      {start: '', stop: ''},
      {start: 0, stop: 0},
      {start: 2000000, stop: 1000},
    ]) {
      expect(autosomalCoverage([{...segment, ...positions}])).toBeNull()
    }
  })

  it('counts overlapping segments once', () => {
    const half = covering(0.5)
    const relabelled = half.map(seg => ({
      ...seg,
      chromosome: `chr${seg.chromosome}`,
    }))
    expect(autosomalCoverage([...half, ...relabelled])).toBeCloseTo(0.5)
    expect(estimateRelationship([...half, ...relabelled]).parentChild).toBe(
      false
    )
  })

  it('treats a missing parent/child coverage as unchecked', () => {
    const noPositions = covering(0.98).map(seg => ({
      ...seg,
      start: 0,
      stop: 0,
    }))
    const estimate = estimateRelationship(noPositions)
    expect(estimate.coverage).toBeNull()
    expect(checkTreeRelationship(estimate, 1, 1)).toBeNull()
  })
})

describe('parent and child', () => {
  const estimate = estimateRelationship(covering(0.98))

  it('are recognized by the coverage', () => {
    expect(estimate.groups).toEqual([{group: PARENT_CHILD, probability: 1}])
  })

  it('fit a parent in the tree, but not a sibling', () => {
    expect(checkTreeRelationship(estimate, 1, 1).conflict).toBe(false)
    const sibling = checkTreeRelationship(estimate, 2, 2)
    expect(sibling.conflict).toBe(true)
    expect(sibling.ratio).toBeNull()
  })

  it('are flagged when the DNA is too little for a parent', () => {
    const half = estimateRelationship(covering(0.5))
    expect(checkTreeRelationship(half, 1, 1).conflict).toBe(true)
  })
})

describe('full siblings', () => {
  const full = estimateRelationship(covering(0.75))
  const half = estimateRelationship(covering(0.5))

  it('are told apart from half siblings by the coverage', () => {
    expect(full.groups[0].group).toBe(FULL_SIBLING)
    expect(half.groups[0].group).toBe(2)
  })

  it('are checked against the tree', () => {
    expect(checkTreeRelationship(full, 2, 2).conflict).toBe(false)
    expect(checkTreeRelationship(full, 2, 1).conflict).toBe(true)
    expect(checkTreeRelationship(half, 2, 2).conflict).toBe(true)
    expect(checkTreeRelationship(half, 2, 1).conflict).toBe(false)
  })

  it('are not recognized without segment positions', () => {
    const groups = estimateRelationship(FIRST_COUSINS).groups.map(
      ({group}) => group
    )
    expect(groups).not.toContain(FULL_SIBLING)
    expect(
      checkTreeRelationship(estimateRelationship(FIRST_COUSINS), 2, 2)
    ).toBeNull()
  })
})

describe('labels', () => {
  const translate = (s, ...args) =>
    args.reduce((text, arg) => text.replace('%s', arg), s)

  it('names parent, child and full siblings, and degrees otherwise', () => {
    expect(groupLabel(PARENT_CHILD, translate)).toBe('Parent or child')
    expect(groupLabel(FULL_SIBLING, translate)).toBe('Full sibling')
    expect(groupLabel(3, translate)).toBe('Relative of degree 3')
    expect(groupLabel(9, translate)).toBe('Relative of degree 9+')
  })

  it('adds the likelihood ratio to the warning if there is one', () => {
    expect(conflictWarning({ratio: null}, translate)).toBe(
      'The shared DNA is unlikely for the relationship in the tree.'
    )
    expect(conflictWarning({ratio: 1 / 3456}, translate, 'en')).toBe(
      'The shared DNA is unlikely for the relationship in the tree. (1 : 3,500)'
    )
  })
})

describe('GrampsjsDnaMatch summary', () => {
  it('shows shared DNA, segments and largest segment for the language', () => {
    const el = new GrampsjsDnaMatch()
    el.appState = {
      i18n: {strings: {}, lang: 'de'},
      dbInfo: {gramps_webapi: {version: '3.26.0'}},
    }
    el.data = {segments: segments([600.25, 40.15]), relation: ''}
    const root = document.createElement('div')
    render(el.render(), root)
    const values = [...root.querySelectorAll('dd')].map(dd =>
      dd.textContent.replace(/\s+/g, ' ').trim()
    )
    expect(values.slice(0, 3)).toEqual(['640,4 cM', '2', '600,3 cM'])
  })
})

describe('segment table order', () => {
  it('sorts by chromosome, then X, then start position', () => {
    const sorted = sortSegments([
      {chromosome: '13', start: 5},
      {chromosome: 'X', start: 1},
      {chromosome: '2', start: 9},
      {chromosome: 'chr2', start: 3},
      {chromosome: '10', start: 1},
    ])
    expect(sorted.map(seg => `${seg.chromosome}:${seg.start}`)).toEqual([
      'chr2:3',
      '2:9',
      '10:1',
      '13:5',
      'X:1',
    ])
  })

  it('sorts the chromosome column numerically', () => {
    expect(chromosomeOrder('10')).toBeGreaterThan(chromosomeOrder('9'))
    expect(chromosomeOrder('X')).toBe(23)
    expect(chromosomeOrder('MT')).toBe(24)
  })
})

describe('segments CSV', () => {
  it('writes the columns the match import reads, sorted', () => {
    const csv = segmentsCsv([
      {chromosome: '13', start: 5, stop: 9, cM: 32.2, SNPs: 6283, side: 'P'},
      {chromosome: '2', start: 1, stop: 4, cM: 7.5, SNPs: 900, side: 'M'},
    ])
    expect(csv).toBe(
      'Chromosome,Start,End,cM,SNPs,Side\n2,1,4,7.5,900,M\n13,5,9,32.2,6283,P\n'
    )
  })

  it('leaves missing values empty', () => {
    expect(segmentsCsv([{chromosome: '1', start: 1, stop: 2, cM: 8}])).toBe(
      'Chromosome,Start,End,cM,SNPs,Side\n1,1,2,8,,\n'
    )
  })
})

describe('GrampsjsDownloadButton', () => {
  it('saves the document with its MIME type', async () => {
    const created = []
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(blob => {
        created.push(blob)
        return 'blob:x'
      })
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const button = new GrampsjsDownloadButton()
    button.mimeType = 'text/csv'
    button.filename = 'a.csv'
    button.content = () => 'a,b\n'
    await button._download()
    createObjectURL.mockRestore()
    revoke.mockRestore()
    expect(created[0].type).toBe('text/csv')
  })
})

describe('editing a match', () => {
  it('shows only the editor and its help', () => {
    const el = new GrampsjsDnaMatch()
    el.appState = {
      i18n: {strings: {}, lang: 'en'},
      dbInfo: {gramps_webapi: {version: '3.26.0'}},
    }
    el.data = {segments: FIRST_COUSINS, relation: 'cousin'}
    el.edit = true
    const root = document.createElement('div')
    render(el.render(), root)
    expect(root.querySelector('grampsjs-form-edit-match')).not.toBeNull()
    expect(root.querySelector('dl')).toBeNull()
    expect(root.querySelector('grampsjs-form-edit-match').helpPath).toBe(
      'user-guide/dna-matches/'
    )
    expect(root.querySelector('h4')).toBeNull()
    expect(root.querySelector('grampsjs-dna-match-table')).toBeNull()
    expect(root.querySelector('grampsjs-connection-chart')).toBeNull()
  })

  const view = ({canEdit = true, grampsIdMatch = 'I2'} = {}) => {
    const el = new GrampsjsViewDnaMatches()
    el.appState = {i18n: {strings: {}}, permissions: {canEdit}}
    el.active = true
    el.matches = true
    el.grampsIdMatch = grampsIdMatch
    return el
  }

  it('starts with the e shortcut on a match', () => {
    const el = view()
    const editModeOn = vi.fn()
    el.addEventListener('edit-mode:on', editModeOn)
    el._toggleEditMode()
    expect(el.edit).toBe(true)
    expect(editModeOn).toHaveBeenCalled()
  })

  it('asks to close with the e shortcut while editing', () => {
    const el = view()
    el.edit = true
    const closeRequest = vi.fn()
    el.addEventListener('edit-mode:close-request', closeRequest)
    el._toggleEditMode()
    expect(closeRequest).toHaveBeenCalled()
  })

  it('ignores the e shortcut without a match or permission', () => {
    for (const el of [view({canEdit: false}), view({grampsIdMatch: ''})]) {
      el._toggleEditMode()
      expect(el.edit).toBe(false)
    }
  })
})
