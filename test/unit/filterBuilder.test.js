import {describe, it, expect} from 'vitest'
import {
  MAX_GROUP_DEPTH,
  addChild,
  defaultValues,
  getNode,
  isComplete,
  localizeRules,
  newCondition,
  newGroup,
  paramLabel,
  paramType,
  pickableRules,
  pillsToTree,
  removeNode,
  searchRules,
  serializeNode,
  treeToFilters,
  treeToPills,
  updateNode,
} from '../../src/filterBuilder.js'
import {
  privacyFilter,
  tagFilter,
  textFilter,
  yearsFilter,
} from '../../src/filterDefinitions.js'

const _ = s => s

const ancestors = {
  rule: 'IsAncestorOf',
  name: 'Ancestors of <person>',
  description: 'Matches people that are ancestors of a specified person',
  category: 'Ancestral filters',
  labels: ['ID:', 'Inclusive:'],
  types: [{type: 'id', namespace: 'Person'}, {type: 'boolean'}],
}

const hasTag = {
  rule: 'HasTag',
  name: 'People with the <tag>',
  description: 'Matches people with the particular tag',
  category: 'General filters',
  labels: ['Tag:'],
}

const matchesFilter = {
  rule: 'MatchesFilter',
  name: 'People matching the <filter>',
  description: 'Matches people matched by the specified filter name',
  category: 'General filters',
  labels: ['Filter name:'],
}

const catalogue = [ancestors, hasTag, matchesFilter]

function tree(func, ...children) {
  const group = newGroup(func)
  group.children = children
  return group
}

function condition(name, values, extra = {}) {
  return {...newCondition(name, values), ...extra}
}

describe('tree editing', () => {
  it('adds, updates and removes nodes by path', () => {
    let t = tree('and', condition('HasTag', ['ToDo']), tree('or'))
    t = addChild(t, [1], condition('PeoplePrivate', []))
    expect(getNode(t, [1, 0]).name).toBe('PeoplePrivate')
    t = updateNode(t, [1], group => ({...group, invert: true}))
    expect(getNode(t, [1]).invert).toBe(true)
    t = removeNode(t, [0])
    expect(t.children).toHaveLength(1)
    expect(getNode(t, [0, 0]).name).toBe('PeoplePrivate')
  })

  it('leaves the original tree unchanged', () => {
    const t = tree('and', condition('HasTag', ['ToDo']))
    updateNode(t, [0], node => ({...node, invert: true}))
    expect(t.children[0].invert).toBe(false)
  })
})

describe('parameter types', () => {
  it('uses the types sent by the backend', () => {
    expect(paramType(ancestors, 0)).toEqual({type: 'id', namespace: 'Person'})
    expect(paramType(ancestors, 1)).toEqual({type: 'boolean'})
  })

  it('falls back to text without types', () => {
    expect(paramType(hasTag, 0)).toEqual({type: 'text'})
  })

  it('falls back to text per parameter', () => {
    const rule = {...ancestors, types: [{type: 'unknown'}, null]}
    expect(paramType(rule, 0)).toEqual({type: 'text'})
    expect(paramType(rule, 1)).toEqual({type: 'text'})
  })

  it('takes the text of labels declared with a custom input', () => {
    expect(paramLabel('Age:')).toBe('Age:')
    expect(paramLabel(['Age:', ''])).toBe('Age:')
    expect(paramLabel(['', ''])).toBe('')
  })

  it('gives new conditions defaults', () => {
    expect(defaultValues(ancestors)).toEqual(['', '0'])
    const select = {
      labels: ['Units:'],
      types: [{type: 'select', options: [{value: '0', label: 'km'}]}],
    }
    expect(defaultValues(select)).toEqual(['0'])
  })
})

describe('rule picker', () => {
  it('hides rules referring to saved filters', () => {
    const typed = {...hasTag, rule: 'Other', types: [{type: 'filter'}]}
    expect(pickableRules([...catalogue, typed])).toEqual([ancestors, hasTag])
  })

  it('searches name, description and category, grouped by category', () => {
    expect(searchRules(catalogue, 'ancestral')).toEqual([
      {category: 'Ancestral filters', rules: [ancestors]},
    ])
    expect(searchRules(catalogue, 'people tag')).toEqual([
      {category: 'General filters', rules: [hasTag]},
    ])
    expect(searchRules(catalogue, '')).toHaveLength(2)
  })
})

describe('isComplete', () => {
  it('accepts an empty top group', () => {
    expect(isComplete(tree('and'), catalogue)).toBe(true)
  })

  it('rejects empty nested groups', () => {
    expect(isComplete(tree('and', tree('or')), catalogue)).toBe(false)
  })

  it('requires IDs', () => {
    const t = tree('and', condition('IsAncestorOf', ['', '0']))
    expect(isComplete(t, catalogue)).toBe(false)
    const filled = tree('and', condition('IsAncestorOf', ['I0001', '0']))
    expect(isComplete(filled, catalogue)).toBe(true)
  })

  it('accepts empty text parameters', () => {
    expect(isComplete(tree('and', condition('HasTag', [''])), catalogue)).toBe(
      true
    )
  })
})

describe('serialization', () => {
  it('sends a negated condition as a negated group', () => {
    expect(
      serializeNode(condition('HasTag', ['ToDo'], {invert: true}))
    ).toEqual({
      function: 'and',
      invert: true,
      rules: [{name: 'HasTag', values: ['ToDo']}],
    })
  })

  it('keeps the regex flag', () => {
    expect(serializeNode(condition('HasTag', ['T.*'], {regex: true}))).toEqual({
      name: 'HasTag',
      values: ['T.*'],
      regex: true,
    })
  })

  it('sends the children of a plain "and" top group', () => {
    const t = tree('and', condition('HasTag', ['ToDo']), tree('or'))
    expect(treeToFilters(t)).toEqual([
      {name: 'HasTag', values: ['ToDo']},
      {function: 'or', invert: false, rules: []},
    ])
  })

  it('sends other top groups as one group', () => {
    const t = tree('or', condition('HasTag', ['A']), condition('HasTag', ['B']))
    expect(treeToFilters(t)).toEqual([
      {
        function: 'or',
        invert: false,
        rules: [
          {name: 'HasTag', values: ['A']},
          {name: 'HasTag', values: ['B']},
        ],
      },
    ])
    expect(treeToFilters(tree('or'))).toEqual([])
  })

  it('keeps the deepest groups within the backend limit', () => {
    // backend depth of a nested group: view group 0, top group 1, ...
    let t = condition('HasTag', ['A'], {invert: true})
    for (let depth = MAX_GROUP_DEPTH; depth > 0; depth -= 1) {
      t = tree('and', t)
    }
    const top = tree('or', t)
    const depthOf = node =>
      node.rules ? 1 + Math.max(0, ...node.rules.map(depthOf)) : 0
    const sent = {function: 'and', rules: treeToFilters(top)}
    // number of nested groups below the view's group
    expect(depthOf(sent) - 1).toBeLessThanOrEqual(4)
  })
})

describe('facet conversion', () => {
  const sections = [
    yearsFilter(_, {label: 'Birth year', rule: 'HasBirth'}),
    textFilter(_, {label: 'Name', rule: 'HasNameOf', numArgs: 2}),
    tagFilter(_),
    privacyFilter(_, {rule: 'PeoplePrivate', publicRule: 'PeoplePublic'}),
  ]

  const pills = [
    {
      sectionId: 'HasBirth:0',
      rule: {name: 'HasBirth', values: ['1800-1850', '', '']},
    },
    {sectionId: 'HasTag', rule: {name: 'HasTag', values: ['ToDo']}},
    {sectionId: 'HasTag', rule: {name: 'HasTag', values: ['Done']}},
    {sectionId: 'privacy', rule: {name: 'PeoplePrivate'}},
  ]

  it('round-trips facet pills', () => {
    const t = pillsToTree(pills)
    expect(t.function).toBe('and')
    expect(t.children.map(c => c.name)).toEqual([
      'HasBirth',
      'HasTag',
      'HasTag',
      'PeoplePrivate',
    ])
    expect(treeToPills(t, sections)).toEqual(pills)
  })

  it('sends the same rules as the facets', () => {
    expect(treeToFilters(pillsToTree(pills))).toEqual([
      {name: 'HasBirth', values: ['1800-1850', '', '']},
      {name: 'HasTag', values: ['ToDo']},
      {name: 'HasTag', values: ['Done']},
      {name: 'PeoplePrivate'},
    ])
  })

  it('rejects trees the facets cannot show', () => {
    const tag = () => condition('HasTag', ['ToDo'])
    expect(treeToPills(tree('or', tag()), sections)).toBeNull()
    expect(treeToPills(tree('and', tree('and', tag())), sections)).toBeNull()
    expect(
      treeToPills(
        tree('and', condition('HasTag', ['A'], {invert: true})),
        sections
      )
    ).toBeNull()
    expect(
      treeToPills(tree('and', condition('IsAncestorOf', ['I1', '0'])), sections)
    ).toBeNull()
    // the years facet holds one span only
    const birth = values => condition('HasBirth', values)
    expect(
      treeToPills(
        tree('and', birth(['1800-1850', '', '']), birth(['1900-1950', '', ''])),
        sections
      )
    ).toBeNull()
    // a birth place is no birth year
    expect(
      treeToPills(tree('and', birth(['', 'Bavaria', ''])), sections)
    ).toBeNull()
  })

  it('accepts an empty tree', () => {
    expect(treeToPills(tree('and'), sections)).toEqual([])
  })
})

describe('localizeRules', () => {
  const upper = s => s.toUpperCase()

  it('translates the rules the API adds', () => {
    const query = {
      rule: 'MatchesQuery',
      name: 'People matching the <GOQL expression>',
      description: 'Matches objects ...',
      category: 'Allgemeine Filter',
      labels: ['Expression:'],
    }
    expect(localizeRules([query], upper)).toEqual([
      {
        ...query,
        name: 'MATCHING THE <GOQL EXPRESSION>',
        description:
          'MATCHES OBJECTS FOR WHICH THE GIVEN GRAMPS OBJECT QUERY LANGUAGE (GOQL) EXPRESSION IS TRUE',
        labels: ['EXPRESSION:'],
      },
    ])
  })

  it('keeps the labels the backend translates', () => {
    const association = {
      rule: 'HasAssociationType',
      name: 'People with association of type <type>',
      description: '',
      category: 'Allgemeine Filter',
      labels: ['Typ:'],
    }
    expect(localizeRules([association], upper)[0].labels).toEqual(['Typ:'])
  })

  it('leaves Gramps rules unchanged', () => {
    expect(localizeRules(catalogue, upper)).toEqual(catalogue)
  })
})
