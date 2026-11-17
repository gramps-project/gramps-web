import {describe, it, expect} from 'vitest'
import {
  changeRows,
  formatDate,
  handlesToFetch,
  markProposalsReported,
  previousProposalStatus,
  proposalChanges,
} from '../../src/chatProposal.js'

const date = (dateval, extra = {}) => ({
  _class: 'Date',
  calendar: 0,
  modifier: 0,
  quality: 0,
  dateval,
  text: '',
  sortval: 0,
  newyear: 0,
  ...extra,
})

const emptyDate = date([0, 0, 0, false])

const type = (cls, value, string = '') => ({_class: cls, value, string})

const eventRef = (ref, role = 1) => ({
  _class: 'EventRef',
  ref,
  role: type('EventRoleType', role),
  private: false,
  citation_list: [],
  note_list: [],
  attribute_list: [],
})

const person = (overrides = {}) => ({
  _class: 'Person',
  handle: 'P1',
  gramps_id: 'I0001',
  change: 1,
  gender: 1,
  primary_name: {
    _class: 'Name',
    first_name: 'Charles',
    surname_list: [
      {
        _class: 'Surname',
        surname: 'Windsor',
        prefix: '',
        primary: true,
        origintype: type('NameOriginType', 1),
        connector: '',
      },
    ],
    suffix: '',
    title: '',
    type: type('NameType', 2),
    call: '',
    nick: '',
    famnick: '',
    group_as: '',
    sort_as: 0,
    display_as: 0,
    date: emptyDate,
    private: false,
    citation_list: [],
    note_list: [],
  },
  alternate_names: [],
  event_ref_list: [],
  family_list: [],
  parent_family_list: [],
  birth_ref_index: -1,
  death_ref_index: -1,
  citation_list: [],
  note_list: [],
  tag_list: [],
  private: false,
  ...overrides,
})

const event = (overrides = {}) => ({
  _class: 'Event',
  handle: 'E1',
  gramps_id: 'E0001',
  change: 1,
  type: type('EventType', 12),
  date: date([0, 0, 1926, false]),
  place: '',
  description: '',
  citation_list: [],
  note_list: [],
  private: false,
  ...overrides,
})

const text = value => ({kind: 'text', text: value})
const label = (value, context = '') => ({kind: 'label', text: value, context})
const ref = (objClass, handle) => ({kind: 'ref', objClass, handle})

describe('changeRows', () => {
  it('shows a changed date as one row', () => {
    const before = event()
    const after = event({date: date([21, 4, 1926, false]), change: 2})
    expect(changeRows(before, after)).toEqual([
      {
        path: ['Date'],
        before: {kind: 'date', date: before.date},
        after: {kind: 'date', date: after.date},
      },
    ])
  })

  it('shows the fields of a new record, without empty and default values', () => {
    const rows = changeRows(null, person({event_ref_list: [eventRef('E1')]}))
    expect(rows).toEqual([
      {path: ['Gender'], before: null, after: label('Male')},
      {path: ['Given name'], before: null, after: text('Charles')},
      {path: ['Surname'], before: null, after: text('Windsor')},
      {path: ['Events'], before: null, after: ref('event', 'E1')},
    ])
  })

  it('shows a value that differs from the default of a new record', () => {
    const rows = changeRows(
      null,
      event({type: type('EventType', 0, 'Graduation'), date: emptyDate})
    )
    expect(rows).toEqual([
      {path: ['Type'], before: null, after: text('Graduation')},
    ])
  })

  it('shows an added reference with a role other than the default', () => {
    const rows = changeRows(
      person(),
      person({event_ref_list: [eventRef('E2', 8)]})
    )
    expect(rows).toEqual([
      {path: ['Events'], before: null, after: ref('event', 'E2')},
      {
        path: ['Events', ref('event', 'E2'), 'Role'],
        before: null,
        after: label('Family', 'Role'),
      },
    ])
  })

  it('shows a changed role of a reference under the reference', () => {
    const rows = changeRows(
      person({event_ref_list: [eventRef('E1')]}),
      person({event_ref_list: [eventRef('E1', 7)]})
    )
    expect(rows).toEqual([
      {
        path: ['Events', ref('event', 'E1'), 'Role'],
        before: label('Primary', 'Role'),
        after: label('Witness'),
      },
    ])
  })

  it('pairs repeated references in order', () => {
    const before = person({event_ref_list: [eventRef('A'), eventRef('B')]})
    const after = person({
      event_ref_list: [eventRef('A'), eventRef('B'), eventRef('A')],
    })
    expect(changeRows(before, after)).toEqual([
      {path: ['Events'], before: null, after: ref('event', 'A')},
    ])
    const removed = person({event_ref_list: [eventRef('A'), eventRef('A')]})
    expect(changeRows(after, removed)).toEqual([
      {path: ['Events'], before: ref('event', 'B'), after: null},
    ])
  })

  it('shows added and removed handles of a handle list', () => {
    const rows = changeRows(
      person({citation_list: ['C1', 'C2']}),
      person({citation_list: ['C2', 'C3']})
    )
    expect(rows).toEqual([
      {path: ['Citations'], before: ref('citation', 'C1'), after: null},
      {path: ['Citations'], before: null, after: ref('citation', 'C3')},
    ])
  })

  it('shows a changed parent of a family as a reference', () => {
    const family = {
      _class: 'Family',
      handle: 'F1',
      father_handle: 'P1',
      mother_handle: null,
      child_ref_list: [],
    }
    expect(changeRows(family, {...family, mother_handle: 'P2'})).toEqual([
      {path: ['Mother'], before: null, after: ref('person', 'P2')},
    ])
  })

  it('leaves out bookkeeping and derived fields', () => {
    const before = person()
    const after = person({change: 5, birth_ref_index: 0, gramps_id: 'I0002'})
    expect(changeRows(before, after)).toEqual([])
  })

  it('shows unknown fields by their name', () => {
    const rows = changeRows(
      event({extra_field: 'a'}),
      event({extra_field: 'b'})
    )
    expect(rows).toEqual([
      {path: ['extra_field'], before: text('a'), after: text('b')},
    ])
  })
})

describe('proposalChanges', () => {
  it('orders additions first and deletions last, and drops empty updates', () => {
    const transaction = [
      {
        type: 'delete',
        _class: 'Note',
        handle: 'N1',
        old: {gramps_id: 'N0001'},
        new: null,
      },
      {
        type: 'update',
        _class: 'Person',
        handle: 'P1',
        old: person(),
        new: person({change: 2}),
      },
      {
        type: 'update',
        _class: 'Event',
        handle: 'E1',
        old: event(),
        new: event({description: 'Born at home'}),
      },
      {
        type: 'add',
        _class: 'Person',
        handle: 'P2',
        old: null,
        new: person({handle: 'P2', gramps_id: 'I0002'}),
      },
    ]
    const changes = proposalChanges(transaction)
    expect(
      changes.map(c => [c.type, c.objClass, c.handle, c.grampsId])
    ).toEqual([
      ['add', 'person', 'P2', 'I0002'],
      ['update', 'event', 'E1', 'E0001'],
      ['delete', 'note', 'N1', 'N0001'],
    ])
    expect(changes[2].rows).toEqual([])
  })

  it('accepts a missing transaction', () => {
    expect(proposalChanges(undefined)).toEqual([])
  })
})

describe('handlesToFetch', () => {
  it('fetches changed and referenced records, but not added ones', () => {
    const changes = proposalChanges([
      {
        type: 'add',
        _class: 'Event',
        handle: 'E2',
        old: null,
        new: event({handle: 'E2', place: 'PL1'}),
      },
      {
        type: 'update',
        _class: 'Person',
        handle: 'P1',
        old: person(),
        new: person({event_ref_list: [eventRef('E2'), eventRef('E3', 8)]}),
      },
    ])
    const handles = handlesToFetch(changes)
    expect(handles).toEqual({
      place: ['PL1'],
      person: ['P1'],
      event: ['E3'],
    })
  })
})

describe('formatDate', () => {
  const translate = s => `<${s}>`
  const translateContext = (context, s) => `<${context}:${s}>`

  it('formats regular dates, leaving out what is not known', () => {
    expect(formatDate(date([21, 4, 1926, false]), translate)).toBe('1926-04-21')
    expect(formatDate(date([0, 4, 1926, false]), translate)).toBe('1926-04')
    expect(formatDate(date([0, 0, 1926, false]), translate)).toBe('1926')
    expect(formatDate(date([3, 5, 0, false]), translate)).toBe('????-05-03')
  })

  it('formats modifiers, quality and calendar', () => {
    expect(
      formatDate(date([0, 0, 1850, false], {modifier: 3}), translate)
    ).toBe('<about> 1850')
    expect(
      formatDate(
        date([0, 0, 1840, false, 0, 0, 1845, false], {modifier: 4}),
        translate
      )
    ).toBe('<between> 1840 <and> 1845')
    expect(
      formatDate(
        date([0, 0, 1840, false, 0, 0, 1845, false], {modifier: 5}),
        translate
      )
    ).toBe('<from> 1840 <to> 1845')
    expect(
      formatDate(
        date([0, 0, 1850, false], {quality: 1, calendar: 1}),
        translate,
        translateContext
      )
    ).toBe('<estimated> 1850 (<calendar:Julian>)')
  })

  it('formats dual and negative years as Gramps does', () => {
    expect(formatDate(date([0, 2, 1732, true]), translate)).toBe('1731/2-02')
    expect(formatDate(date([0, 0, 1710, true]), translate)).toBe('1709/10')
    expect(formatDate(date([0, 0, 1800, true]), translate)).toBe('1799/800')
    expect(formatDate(date([15, 3, -44, false]), translate)).toBe(
      '44-03-15 B.C.E.'
    )
    expect(formatDate(date([0, 0, 44, false]), translate)).toBe('44')
  })

  it('shows the new year a date counts from', () => {
    expect(formatDate(date([0, 2, 1732, false], {newyear: 2}), translate)).toBe(
      '1732-02 (Mar25)'
    )
    expect(
      formatDate(
        date([0, 2, 1732, false], {newyear: [4, 1], calendar: 1}),
        translate,
        translateContext
      )
    ).toBe('1732-02 (<calendar:Julian>, 4-1)')
  })

  it('shows the text of a text-only date and nothing for an empty one', () => {
    expect(
      formatDate(
        date([0, 0, 0, false], {modifier: 6, text: 'Easter'}),
        translate
      )
    ).toBe('Easter')
    expect(formatDate(emptyDate, translate)).toBe('')
    expect(formatDate(undefined, translate)).toBe('')
  })
})

describe('previousProposalStatus', () => {
  const proposal = {id: 'p', transaction: [{}]}
  const question = {role: 'human', message: 'Who is he?'}
  const failed = {role: 'error', message: 'An error occurred'}
  const answer = (extra = {}) => ({role: 'ai', message: 'Done', ...extra})
  const applied = answer({
    proposal,
    proposalStatus: 'applied',
    proposalUnreported: true,
  })

  it('reports a proposal applied since the last answer', () => {
    expect(previousProposalStatus([applied])).toBe('applied')
    // applied after a later answer without a proposal
    expect(previousProposalStatus([applied, question, answer()])).toBe(
      'applied'
    )
    // applied after a later answer with a proposal, which is now outdated
    const outdated = answer({proposal, proposalStatus: 'outdated'})
    expect(previousProposalStatus([applied, question, outdated])).toBe(
      'applied'
    )
  })

  it('reports a proposal of the last answer that is not applied', () => {
    for (const proposalStatus of [undefined, '', 'outdated']) {
      expect(previousProposalStatus([answer({proposal, proposalStatus})])).toBe(
        'not_applied'
      )
    }
  })

  it('reports again after a failed query', () => {
    expect(previousProposalStatus([applied, question, failed])).toBe('applied')
    expect(previousProposalStatus([answer({proposal}), question, failed])).toBe(
      'not_applied'
    )
  })

  it('is empty once reported, or without a proposal', () => {
    const [reported] = markProposalsReported([applied])
    expect(previousProposalStatus([reported, question, answer()])).toBe('')
    expect(previousProposalStatus([answer()])).toBe('')
    expect(previousProposalStatus([])).toBe('')
  })
})

describe('markProposalsReported', () => {
  it('drops the flag of applied proposals and keeps the rest', () => {
    const other = {role: 'human', message: 'Hi'}
    const [reported, kept] = markProposalsReported([
      {role: 'ai', proposalStatus: 'applied', proposalUnreported: true},
      other,
    ])
    expect(reported).toEqual({role: 'ai', proposalStatus: 'applied'})
    expect(kept).toBe(other)
  })
})
