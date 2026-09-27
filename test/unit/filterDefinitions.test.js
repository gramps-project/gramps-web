import {describe, it, expect} from 'vitest'
import {
  associationsFilter,
  findSection,
  indexedRule,
  mimeFilter,
  parseYears,
  pillLabel,
  privacyFilter,
  propertiesFilter,
  removePill,
  sectionRules,
  setSectionRules,
  tagFilter,
  textFilter,
  typeFilter,
  yearsFilter,
  yearsRule,
} from '../../src/filterDefinitions.js'

const _ = s => s

describe('section builders', () => {
  it('gives years and text sections one id per parameter slot', () => {
    const date = yearsFilter(_, {
      label: 'Date',
      rule: 'HasData',
      index: 1,
      numArgs: 4,
    })
    const place = textFilter(_, {
      label: 'Place',
      rule: 'HasData',
      index: 2,
      numArgs: 4,
    })
    expect(date.id).toBe('HasData:1')
    expect(place.id).toBe('HasData:2')
  })

  it('strips a trailing colon from type labels', () => {
    const section = typeFilter(_, {label: 'Note type:', typeName: 'note_types'})
    expect(section.label).toBe('Note type')
    expect(section.rule).toBe('HasType')
  })

  it('removes the count placeholder from association labels', () => {
    const section = associationsFilter(_, {
      HasNote: 'People having <count> notes',
    })
    expect(section.entries).toEqual([
      {
        label: 'People having notes',
        rule: {name: 'HasNote', values: ['0', 'greater than']},
      },
    ])
  })

  it('builds property rules without values', () => {
    const section = propertiesFilter(_, {IsFemale: 'Females'})
    expect(section.entries[0].rule).toEqual({name: 'IsFemale'})
  })

  it('adds the public rule only when given', () => {
    expect(privacyFilter(_, {rule: 'NotePrivate'}).entries).toHaveLength(1)
    const section = privacyFilter(_, {
      rule: 'PeoplePrivate',
      publicRule: 'PeoplePublic',
    })
    expect(section.entries.map(e => e.rule.name)).toEqual([
      'PeoplePrivate',
      'PeoplePublic',
    ])
  })
})

describe('rules', () => {
  it('puts the value at the parameter index', () => {
    const section = textFilter(_, {
      label: 'Description',
      rule: 'HasData',
      index: 3,
      numArgs: 4,
    })
    expect(indexedRule(section, 'baptism')).toEqual({
      name: 'HasData',
      values: ['', '', '', 'baptism'],
    })
  })

  it('uses English date syntax without a server locale', () => {
    const section = yearsFilter(_, {label: 'Birth year', rule: 'HasBirth'})
    expect(yearsRule(section, '1800', '1850')).toEqual({
      name: 'HasBirth',
      values: ['from 1800 until 1850', '', ''],
    })
  })

  it('uses the date syntax of the server locale', () => {
    const section = yearsFilter(_, {label: 'Birth year', rule: 'HasBirth'})
    expect(yearsRule(section, '1800', '1850', 'de').values[0]).toBe(
      'zwischen 1800 und 1850'
    )
  })

  it('falls back to English syntax for an unknown server locale', () => {
    const section = yearsFilter(_, {label: 'Birth year', rule: 'HasBirth'})
    expect(yearsRule(section, '1800', '1850', 'xx').values[0]).toBe(
      'from 1800 until 1850'
    )
  })

  it('parses years from a localized span', () => {
    const rule = {name: 'HasBirth', values: ['zwischen 1800 und 1850', '', '']}
    expect(parseYears(rule, 0)).toEqual(['1800', '1850'])
    expect(parseYears(undefined, 0)).toEqual(['', ''])
  })
})

describe('labels', () => {
  const birth = yearsFilter(_, {label: 'Birth year', rule: 'HasBirth'})

  it('shows a single year once', () => {
    const rule = yearsRule(birth, '1850', '1850')
    expect(pillLabel(_, birth, rule)).toBe('Birth year: 1850')
  })

  it('shows a span of years', () => {
    const rule = yearsRule(birth, '1800', '1850')
    expect(pillLabel(_, birth, rule)).toBe('Birth year: 1800-1850')
  })

  it('shows the media type name', () => {
    const rule = {name: 'HasMedia', values: ['', 'image/', '', '']}
    expect(pillLabel(_, mimeFilter(_), rule)).toBe('_Media Type: Image')
  })

  it('uses the singular for tag pills', () => {
    const rule = {name: 'HasTag', values: ['ToDo']}
    expect(pillLabel(_, tagFilter(_), rule)).toBe('Tag: ToDo')
  })

  it('shows the checkbox label alone', () => {
    const section = propertiesFilter(_, {IsFemale: 'Females'})
    expect(pillLabel(_, section, {name: 'IsFemale'})).toBe('Females')
  })
})

describe('pills', () => {
  const birth = yearsFilter(_, {label: 'Birth year', rule: 'HasBirth'})
  const tags = tagFilter(_)
  const sections = [birth, tags]
  const birthPill = {
    sectionId: birth.id,
    rule: yearsRule(birth, '1800', '1850'),
  }
  const todoPill = {
    sectionId: tags.id,
    rule: {name: 'HasTag', values: ['ToDo']},
  }
  const donePill = {
    sectionId: tags.id,
    rule: {name: 'HasTag', values: ['Done']},
  }

  it('finds sections', () => {
    expect(findSection(sections, 'HasTag')).toBe(tags)
    expect(findSection(sections, 'nope')).toBeUndefined()
  })

  it('collects the rules of a section', () => {
    const pills = [todoPill, birthPill, donePill]
    expect(sectionRules(pills, tags.id)).toEqual([todoPill.rule, donePill.rule])
  })

  it('appends rules of a section without pills', () => {
    expect(setSectionRules([todoPill], birth.id, [birthPill.rule])).toEqual([
      todoPill,
      birthPill,
    ])
  })

  it('replaces the rules of a section in place', () => {
    const rule = yearsRule(birth, '1900', '1950')
    expect(setSectionRules([birthPill, todoPill], birth.id, [rule])).toEqual([
      {sectionId: birth.id, rule},
      todoPill,
    ])
  })

  it('keeps several pills of a section together', () => {
    const pills = [todoPill, birthPill, donePill]
    expect(
      setSectionRules(pills, tags.id, [todoPill.rule, donePill.rule])
    ).toEqual([todoPill, donePill, birthPill])
  })

  it('removes all pills of a section for no rules', () => {
    expect(setSectionRules([birthPill, todoPill], tags.id, [])).toEqual([
      birthPill,
    ])
  })

  it('removes pills', () => {
    expect(removePill([todoPill, birthPill], 0)).toEqual([birthPill])
  })
})
