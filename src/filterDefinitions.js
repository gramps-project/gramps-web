/*
Definitions of the filters offered in the filter panel of list views.

A view passes a list of sections to <grampsjs-filters>. Each section is
one collapsible part of the panel, with a `label` for its header, an
optional `pillLabel` for its pills, and an `editor` for its rules:

- 'years', 'text', 'type', 'mime', 'objectType': one rule `rule` with
  parameters, where `index` and `numArgs` place the value among them
- 'tags': one `HasTag` rule per selected tag
- 'checkboxes': rules without parameters, one per checked `entries` item,
  each an object `{label, rule}`

All builders take the translation function `_` and return translated labels.

The active filters are pills, each an object `{sectionId, rule}`.
*/

import {dateSpanLocal, filterMime} from './util.js'

export function yearsFilter(_, {label, rule, index = 0, numArgs = 3}) {
  return {
    id: `${rule}:${index}`,
    label: _(label),
    editor: 'years',
    rule,
    index,
    numArgs,
  }
}

export function textFilter(_, {label, rule, index = 0, numArgs = 1}) {
  return {
    id: `${rule}:${index}`,
    label: _(label),
    editor: 'text',
    rule,
    index,
    numArgs,
  }
}

export function typeFilter(_, {label, typeName, rule = 'HasType'}) {
  return {
    id: rule,
    label: _(label).replace(/:$/, ''),
    editor: 'type',
    rule,
    typeName,
  }
}

export function tagFilter(_) {
  return {
    id: 'HasTag',
    label: _('Tags'),
    pillLabel: _('Tag'),
    editor: 'tags',
    rule: 'HasTag',
  }
}

export function mimeFilter(_) {
  return {
    id: 'HasMedia:mime',
    label: _('_Media Type:').replace(/:$/, ''),
    editor: 'mime',
    rule: 'HasMedia',
  }
}

export function objectTypeFilter(_) {
  return {
    id: 'IsReferencedByObjectType',
    label: _('Subject'),
    editor: 'objectType',
    rule: 'IsReferencedByObjectType',
  }
}

// Rules without parameters from a `{rule: label}` map
export function propertiesFilter(_, props) {
  return {
    id: 'properties',
    label: _('Properties'),
    editor: 'checkboxes',
    entries: Object.entries(props).map(([name, label]) => ({
      label: _(label),
      rule: {name},
    })),
  }
}

// Rules for objects with at least one associated object, from a
// `{rule: label}` map where the label contains a `<count>` placeholder
export function associationsFilter(_, props) {
  return {
    id: 'associations',
    label: _('Associations'),
    editor: 'checkboxes',
    entries: Object.entries(props).map(([name, label]) => ({
      label: _(label)
        .replace(/<[^>]+>/, '')
        .replace(/\s+/g, ' ')
        .trim(),
      rule: {name, values: ['0', 'greater than']},
    })),
  }
}

export function privacyFilter(_, {rule, publicRule = ''}) {
  const entries = [{label: _('Private'), rule: {name: rule}}]
  if (publicRule) {
    entries.push({label: _('Not private'), rule: {name: publicRule}})
  }
  return {id: 'privacy', label: _('Privacy'), editor: 'checkboxes', entries}
}

export function rulesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// A rule with `value` at the section's parameter index and empty strings
// for all other parameters
export function indexedRule(section, value) {
  const values = Array(section.numArgs).fill('')
  values[section.index] = value
  return {name: section.rule, values}
}

// The rule for a span of years, using the date syntax of the server locale
export function yearsRule(section, yearFrom, yearUntil, serverLang) {
  const localized = serverLang
    ? dateSpanLocal(yearFrom, yearUntil, serverLang)
    : null
  return indexedRule(
    section,
    localized ?? `from ${yearFrom} until ${yearUntil}`
  )
}

// The first and last year of a span in a years rule, or empty strings
export function parseYears(rule, index) {
  const match = (rule?.values?.[index] ?? '').match(/(\d+)\D+(\d+)/)
  return match ? [match[1], match[2]] : ['', '']
}

// The value of a rule as shown to the user, without the section label
export function ruleSummary(_, section, rule) {
  const values = rule.values ?? []
  switch (section.editor) {
    case 'years': {
      const [yearFrom, yearUntil] = parseYears(rule, section.index)
      return yearFrom === yearUntil ? yearFrom : `${yearFrom}-${yearUntil}`
    }
    case 'text':
      return values[section.index]
    case 'mime':
      return _(filterMime[values[1]] ?? values[1])
    case 'tags':
      return values[0]
    case 'type':
    case 'objectType':
      return _(values[0])
    case 'checkboxes':
      return section.entries.find(e => rulesEqual(e.rule, rule))?.label ?? ''
    default:
      return ''
  }
}

export function pillLabel(_, section, rule) {
  const summary = ruleSummary(_, section, rule)
  return section.editor === 'checkboxes'
    ? summary
    : `${section.pillLabel ?? section.label}: ${summary}`
}

export function findSection(sections, sectionId) {
  return sections.find(section => section.id === sectionId)
}

export function sectionRules(pills, sectionId) {
  return pills.filter(pill => pill.sectionId === sectionId).map(p => p.rule)
}

// The pills after replacing the rules of a section. The new pills take the
// place of the first old pill of the section, or go last if it had none.
export function setSectionRules(pills, sectionId, rules) {
  const newPills = rules.map(rule => ({sectionId, rule}))
  const index = pills.findIndex(pill => pill.sectionId === sectionId)
  const others = pills.filter(pill => pill.sectionId !== sectionId)
  if (index === -1) {
    return [...others, ...newPills]
  }
  return [...others.slice(0, index), ...newPills, ...others.slice(index)]
}

export function removePill(pills, index) {
  return pills.filter((_pill, i) => i !== index)
}
