/*
Model of the condition builder, the advanced tier of the filter panel.

The builder edits a tree of nodes:

- group: `{id, kind: 'group', function, invert, children}`, where
  `function` is 'and', 'or' or 'one' as in the backend `rules` JSON
- condition: `{id, kind: 'condition', name, values, invert, regex}`, one
  Gramps rule

The ids only serve to keep rows stable while editing and are not sent.
Nodes are addressed by paths, arrays of child indices from the top group.

The rule catalogue is the `rules` list of `/api/filters/{namespace}`, each
entry `{rule, name, description, category, labels, types?}`. Newer backends
send `types`, one parameter type per label; a missing or unknown type is a
text parameter.
*/

import {rulesEqual} from './filterDefinitions.js'
import {filterMime} from './util.js'

// Nesting limit of the backend `rules` JSON
const BACKEND_MAX_DEPTH = 5

// Deepest builder group that can hold groups of its own. The builder's top
// group may be sent nested in the "and" group of the view (one level), and a
// negated condition is sent as a group of its own (one more level), so a
// group at depth d becomes depth d + 2 in the backend at most.
export const MAX_GROUP_DEPTH = BACKEND_MAX_DEPTH - 3

// Parameter types with a widget of their own
const PARAM_TYPES = [
  'text',
  'boolean',
  'date',
  'datetime',
  'tag',
  'id',
  'integer',
  'gramps_type',
  'select',
]

// Parameter types without a meaningful empty value
const REQUIRED_PARAM_TYPES = ['id', 'integer', 'select']

let nextId = 0

function newId() {
  nextId += 1
  return nextId
}

export function newGroup(func = 'and') {
  return {
    id: newId(),
    kind: 'group',
    function: func,
    invert: false,
    children: [],
  }
}

export function newCondition(name, values = []) {
  return {
    id: newId(),
    kind: 'condition',
    name,
    values,
    invert: false,
    regex: false,
  }
}

export function isGroup(node) {
  return node.kind === 'group'
}

// The node at `path`
export function getNode(tree, path) {
  return path.reduce((node, index) => node.children[index], tree)
}

// The tree after replacing the node at `path` with `fn(node)`
export function updateNode(tree, path, fn) {
  if (path.length === 0) {
    return fn(tree)
  }
  const [index, ...rest] = path
  return {
    ...tree,
    children: tree.children.map((child, i) =>
      i === index ? updateNode(child, rest, fn) : child
    ),
  }
}

export function addChild(tree, path, node) {
  return updateNode(tree, path, group => ({
    ...group,
    children: [...group.children, node],
  }))
}

export function removeNode(tree, path) {
  const parentPath = path.slice(0, -1)
  const index = path[path.length - 1]
  return updateNode(tree, parentPath, group => ({
    ...group,
    children: group.children.filter((_child, i) => i !== index),
  }))
}

// The text of a parameter label. Rules can declare a label as a pair of
// text and a custom input of the Gramps filter editor, which arrives as an
// array.
export function paramLabel(label) {
  return Array.isArray(label) ? String(label[0] ?? '') : String(label ?? '')
}

// The type of the parameter at `index`, `{type: 'text'}` when the backend
// sends no known type for it
export function paramType(ruleInfo, index) {
  const type = ruleInfo?.types?.[index]
  return PARAM_TYPES.includes(type?.type) ? type : {type: 'text'}
}

// The type of each parameter of a catalogue rule
export function paramTypes(ruleInfo) {
  return (ruleInfo?.labels ?? []).map((_label, i) => paramType(ruleInfo, i))
}

// Initial values of a new condition for a catalogue rule
export function defaultValues(ruleInfo) {
  return paramTypes(ruleInfo).map(type => {
    switch (type.type) {
      case 'boolean':
        return '0'
      case 'select':
        return type.options?.[0]?.value ?? ''
      default:
        return ''
    }
  })
}

// Rules that refer to saved custom filters by name. These are hidden, as
// custom filters are not tree-scoped.
export function refersToFilter(ruleInfo) {
  return (
    /Filter(Match)?$/.test(ruleInfo.rule) ||
    (ruleInfo.types ?? []).some(type => type?.type === 'filter') ||
    (ruleInfo.labels ?? []).some(label => /filter name/i.test(label))
  )
}

// The catalogue rules offered in the picker
export function pickableRules(catalogue) {
  return catalogue.filter(ruleInfo => !refersToFilter(ruleInfo))
}

// The rules matching a search, grouped by category in catalogue order, as a
// list of `{category, rules}`
export function searchRules(rules, search) {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)
  const matches = rules.filter(ruleInfo => {
    const text = [ruleInfo.name, ruleInfo.description, ruleInfo.category]
      .join(' ')
      .toLowerCase()
    return words.every(word => text.includes(word))
  })
  const categories = new Map()
  matches.forEach(ruleInfo => {
    if (!categories.has(ruleInfo.category)) {
      categories.set(ruleInfo.category, [])
    }
    categories.get(ruleInfo.category).push(ruleInfo)
  })
  return [...categories].map(([category, list]) => ({category, rules: list}))
}

// Name, description and labels of the rules the API adds to the Gramps
// rules. They are not in the Gramps translations, so the frontend
// translates them.
const API_RULE_STRINGS = {
  HasAssociationType: {
    name: 'People with association of type <type>',
    description: 'Matches people with a certain association type',
  },
  IsReferencedByObjectType: {
    name: 'Media referenced by <type>',
    description: 'Matches media objects referenced by a specific object type',
  },
  MatchesQuery: {
    name: 'Matching the <GOQL expression>',
    description:
      'Matches objects for which the given Gramps Object Query Language (GOQL) expression is true',
    labels: ['Expression:'],
  },
}

// The catalogue with the API's own rules translated by `_`
export function localizeRules(catalogue, _) {
  return catalogue.map(ruleInfo => {
    const strings = API_RULE_STRINGS[ruleInfo.rule]
    if (strings === undefined) {
      return ruleInfo
    }
    return {
      ...ruleInfo,
      name: _(strings.name),
      description: _(strings.description),
      labels: strings.labels?.map(label => _(label)) ?? ruleInfo.labels,
    }
  })
}

export function findRule(catalogue, name) {
  return catalogue.find(ruleInfo => ruleInfo.rule === name)
}

function isConditionComplete(condition, catalogue) {
  const ruleInfo = findRule(catalogue, condition.name)
  return paramTypes(ruleInfo).every(
    (type, i) =>
      !REQUIRED_PARAM_TYPES.includes(type.type) ||
      (condition.values[i] ?? '') !== ''
  )
}

// Whether the tree can be sent: groups other than the top group have
// conditions, and conditions have their required parameters
export function isComplete(tree, catalogue, isTop = true) {
  if (!isGroup(tree)) {
    return isConditionComplete(tree, catalogue)
  }
  if (!isTop && tree.children.length === 0) {
    return false
  }
  return tree.children.every(child => isComplete(child, catalogue, false))
}

// A rule in the backend `rules` JSON. Rules without parameters have no
// values, as in the facet definitions.
function serializeRule(condition) {
  const rule =
    condition.values.length > 0
      ? {name: condition.name, values: condition.values}
      : {name: condition.name}
  return condition.regex ? {...rule, regex: true} : rule
}

// A node in the backend `rules` JSON. Rules can't be negated, so a negated
// condition becomes a negated group holding the rule.
export function serializeNode(node) {
  if (!isGroup(node)) {
    const rule = serializeRule(node)
    return node.invert ? {function: 'and', invert: true, rules: [rule]} : rule
  }
  return {
    function: node.function,
    invert: node.invert,
    rules: node.children.map(serializeNode),
  }
}

// The rules for the "and" group of the view. A plain "and" top group
// contributes its children directly.
export function treeToFilters(tree) {
  if (tree.children.length === 0) {
    return []
  }
  if (tree.function === 'and' && !tree.invert) {
    return tree.children.map(serializeNode)
  }
  return [serializeNode(tree)]
}

// The top group for the active facet pills
export function pillsToTree(pills) {
  const tree = newGroup()
  tree.children = pills.map(pill =>
    newCondition(pill.rule.name, [...(pill.rule.values ?? [])])
  )
  return tree
}

function onlyIndexSet(section, values) {
  return (
    values.length === section.numArgs &&
    values.every((value, i) => (i === section.index) === (value !== ''))
  )
}

// Whether a facet section's editor produces `rule`
function sectionProduces(section, rule) {
  const values = rule.values ?? []
  switch (section.editor) {
    case 'years':
      return (
        rule.name === section.rule &&
        onlyIndexSet(section, values) &&
        /\d+\D+\d+/.test(values[section.index])
      )
    case 'text':
      return rule.name === section.rule && onlyIndexSet(section, values)
    case 'type':
    case 'objectType':
    case 'tags':
      return (
        rule.name === section.rule && values.length === 1 && values[0] !== ''
      )
    case 'mime':
      return (
        rule.name === section.rule &&
        values.length === 4 &&
        values[1] in filterMime &&
        values.every((value, i) => i === 1 || value === '')
      )
    case 'checkboxes':
      return section.entries.some(entry => rulesEqual(entry.rule, rule))
    default:
      return false
  }
}

// Editors that hold a single rule
const SINGLE_RULE_EDITORS = ['years', 'text', 'type', 'mime', 'objectType']

// The facet pills for a tree, or null if the facet panel can't show it:
// the tree is a plain "and" of conditions that the facet editors produce
export function treeToPills(tree, sections) {
  if (tree.function !== 'and' || tree.invert) {
    return null
  }
  const pills = []
  const ok = tree.children.every(node => {
    if (isGroup(node) || node.invert || node.regex) {
      return false
    }
    const rule = serializeRule(node)
    const section = sections.find(s => sectionProduces(s, rule))
    if (section === undefined) {
      return false
    }
    const taken = pills.some(pill => pill.sectionId === section.id)
    const duplicate = pills.some(
      pill => pill.sectionId === section.id && rulesEqual(pill.rule, rule)
    )
    if (duplicate || (taken && SINGLE_RULE_EDITORS.includes(section.editor))) {
      return false
    }
    pills.push({sectionId: section.id, rule})
    return true
  })
  return ok ? pills : null
}
