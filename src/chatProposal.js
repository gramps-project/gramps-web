/*
Readable changes of a transaction proposed by the AI assistant.

A proposal's transaction lists every record it adds, changes or deletes, with
its state before and after, side effects included. Each record becomes a list
of rows, one per changed field. A row has a path of labels and the values
before and after, as descriptors the proposal component renders:

- {kind: 'text', text}: data as entered, shown as is
- {kind: 'label', text, context}: an English Gramps string, shown translated,
  in the Gramps translation context if given
- {kind: 'date', date}: a Gramps date object
- {kind: 'ref', objClass, handle}: a reference to another record

A path segment is an English Gramps string or a reference descriptor.
*/

import {eventTypeStrings, noteTypeStrings, dateIsEmpty} from './util.js'

// Values of Gramps types, by type class. A value Gramps translates in a
// context is given as [context, string].
const TYPE_STRINGS = {
  EventType: eventTypeStrings,
  NoteType: noteTypeStrings,
  EventRoleType: {
    '-1': 'Unknown',
    0: 'Custom',
    1: ['Role', 'Primary'],
    2: 'Clergy',
    3: 'Celebrant',
    4: 'Aide',
    5: 'Bride',
    6: 'Groom',
    7: 'Witness',
    8: ['Role', 'Family'],
    9: 'Informant',
    10: 'Godparent',
    11: 'Father',
    12: 'Mother',
    13: 'Parent',
    14: 'Child',
    15: 'Multiple birth',
    16: 'Friend',
    17: 'Neighbor',
    18: 'Officiator',
  },
  ChildRefType: {
    0: 'None',
    1: ['relationship', 'Birth'],
    2: ['relationship', 'Adopted'],
    3: 'Stepchild',
    4: 'Sponsored',
    5: 'Foster',
    6: 'Unknown',
    7: 'Custom',
  },
  FamilyRelType: {
    0: 'Married',
    1: 'Unmarried',
    2: 'Civil Union',
    3: 'Unknown',
    4: 'Custom',
  },
  NameType: {
    '-1': 'Unknown',
    0: 'Custom',
    1: 'Also Known As',
    2: 'Birth Name',
    3: 'Married Name',
  },
  NameOriginType: {
    '-1': ['Surname', 'Unknown'],
    0: 'Custom',
    1: '',
    2: ['Surname', 'Inherited'],
    3: ['Surname', 'Given'],
    4: ['Surname', 'Taken'],
    5: 'Patronymic',
    6: 'Matronymic',
    7: ['Surname', 'Feudal'],
    8: 'Pseudonym',
    9: 'Patrilineal',
    10: 'Matrilineal',
    11: ['Surname', 'Occupation'],
    12: ['Surname', 'Location'],
  },
  PlaceType: {
    '-1': 'Unknown',
    0: 'Custom',
    1: 'Country',
    2: 'State',
    3: 'County',
    4: 'City',
    5: 'Parish',
    6: 'Locality',
    7: 'Street',
    8: 'Province',
    9: 'Region',
    10: 'Department',
    11: 'Neighborhood',
    12: 'District',
    13: 'Borough',
    14: 'Municipality',
    15: 'Town',
    16: 'Village',
    17: 'Hamlet',
    18: 'Farm',
    19: 'Building',
    20: 'Number',
  },
}

// Type values a new record or list item gets without being asked for, which
// would only add noise to the rows of an addition
const DEFAULT_TYPE_VALUES = {
  EventRoleType: 1,
  ChildRefType: 1,
  NameType: 2,
  NameOriginType: 1,
  PlaceType: -1,
}

// Plain values a new record has unless asked for, by field
const FIELD_DEFAULTS = {format: 0, sort_as: 0, display_as: 0}

// Values of plain numbers, by field
const NUMBER_STRINGS = {
  gender: {0: 'Female', 1: 'Male', 2: 'Unknown', 3: 'Other'},
  confidence: {
    0: 'Very Low',
    1: 'Low',
    2: 'Normal',
    3: 'High',
    4: 'Very High',
  },
}

const FIELD_LABELS = {
  first_name: 'Given name',
  surname: 'Surname',
  prefix: 'Prefix',
  connector: 'Connector',
  origintype: 'Origin',
  call: 'Call name',
  nick: 'Nickname',
  famnick: 'Family nick name',
  title: 'Title',
  suffix: 'Suffix',
  group_as: 'Group as',
  sort_as: 'Sort as',
  display_as: 'Display as',
  alternate_names: 'Alternate Names',
  gender: 'Gender',
  date: 'Date',
  place: 'Place',
  description: 'Description',
  type: 'Type',
  place_type: 'Type',
  role: 'Role',
  event_ref_list: 'Events',
  citation_list: 'Citations',
  note_list: 'Notes',
  tag_list: 'Tags',
  media_list: 'Media',
  attribute_list: 'Attributes',
  address_list: 'Addresses',
  urls: 'Internet',
  person_ref_list: 'Associations',
  child_ref_list: 'Children',
  family_list: 'Families',
  parent_family_list: 'Parents',
  father_handle: 'Father',
  mother_handle: 'Mother',
  frel: 'Father',
  mrel: 'Mother',
  private: 'Private',
  lat: 'Latitude',
  long: 'Longitude',
  name: 'Name',
  alt_names: 'Alternative Names',
  placeref_list: 'Enclosed By',
  alt_loc: 'Alternate Locations',
  code: 'Code',
  lang: 'Language',
  value: 'Value',
  author: 'Author',
  abbrev: 'Abbreviation',
  pubinfo: 'Publication info',
  reporef_list: 'Repositories',
  source_handle: 'Source',
  page: 'Volume/Page',
  confidence: 'Confidence',
  text: 'Text',
  format: 'Format',
}

// Fields that add no label of their own: a person's primary name is the name
// of the person, and a surname is labelled by its fields
const TRANSPARENT_FIELDS = new Set(['primary_name', 'surname_list'])

// Fields that are no data of their own: bookkeeping, values derived from
// other fields, and the ID, which the record's heading shows
const SKIPPED_FIELDS = new Set([
  '_class',
  'handle',
  'change',
  'gramps_id',
  'birth_ref_index',
  'death_ref_index',
  'primary',
])

// Fields that hold the handle of a record, or a list of them
const HANDLE_FIELDS = {
  father_handle: 'person',
  mother_handle: 'person',
  source_handle: 'source',
  place: 'place',
  family_list: 'family',
  parent_family_list: 'family',
  citation_list: 'citation',
  note_list: 'note',
  tag_list: 'tag',
}

// Lists of references, objects that hold the handle of a record in `ref`
const REF_LIST_FIELDS = {
  event_ref_list: 'event',
  child_ref_list: 'person',
  person_ref_list: 'person',
  media_list: 'media',
  placeref_list: 'place',
  reporef_list: 'repository',
}

const isObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isGrampsType = value =>
  isObject(value) &&
  typeof value._class === 'string' &&
  value._class.endsWith('Type') &&
  'value' in value

// Objects shown as one value: a date, a text, a place name and a type
const isAtomic = value =>
  isObject(value) &&
  (['Date', 'StyledText', 'PlaceName'].includes(value._class) ||
    isGrampsType(value))

export function deepEqual(a, b) {
  if (a === b) return true
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, i) => deepEqual(item, b[i]))
    )
  }
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a)
    return (
      keys.length === Object.keys(b).length &&
      keys.every(key => key in b && deepEqual(a[key], b[key]))
    )
  }
  return false
}

const text = value => ({kind: 'text', text: value})
const label = (value, context = '') => ({kind: 'label', text: value, context})
export const refValue = (objClass, handle) =>
  handle ? {kind: 'ref', objClass, handle} : null

// English label of a Gramps type, or its custom text
function typeValue(type) {
  if (type.string) return text(type.string)
  const string = TYPE_STRINGS[type._class]?.[type.value]
  if (string === '') return null
  if (Array.isArray(string)) return label(string[1], string[0])
  return string === undefined ? text(`${type.value}`) : label(string)
}

// Descriptor of a single value of a field, or null for an empty one
export function describeValue(field, value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'boolean') return label(value ? 'Yes' : 'No')
  if (typeof value === 'number') {
    const string = NUMBER_STRINGS[field]?.[value]
    return string === undefined ? text(`${value}`) : label(string)
  }
  if (typeof value === 'string') return text(value)
  if (isGrampsType(value)) return typeValue(value)
  switch (value._class) {
    case 'Date':
      return dateIsEmpty(value) ? null : {kind: 'date', date: value}
    case 'StyledText':
      return value.string ? text(value.string) : null
    case 'PlaceName':
      if (!value.value) return null
      return text(value.lang ? `${value.value} (${value.lang})` : value.value)
    default:
      return text(JSON.stringify(value))
  }
}

// Whether a value is what a new record or list item has unless asked for
function isDefault(field, value) {
  if (value === false || FIELD_DEFAULTS[field] === value) return true
  return (
    isGrampsType(value) &&
    !value.string &&
    DEFAULT_TYPE_VALUES[value._class] === value.value
  )
}

function pushRow(rows, path, before, after) {
  if (before === null && after === null) return
  rows.push({path, before, after})
}

// Rows for a value that is only on one side, as a whole record or list
// item is added or removed: empty values and defaults are left out
function pushOneSided(rows, path, field, value, side) {
  if (isDefault(field, value)) return
  const descriptor = describeValue(field, value)
  pushRow(
    rows,
    path,
    side === 'before' ? descriptor : null,
    side === 'after' ? descriptor : null
  )
}

// Pairs the items of two lists of references, the n-th occurrence of a
// handle on one side with its n-th occurrence on the other, so a repeated
// handle pairs up in order. Returns [before, after] pairs, with null for an
// item that is only on one side.
function pairRefs(before, after, refOf) {
  const used = new Set()
  const pairs = before.map(item => {
    const index = after.findIndex(
      (other, i) => !used.has(i) && refOf(other) === refOf(item)
    )
    if (index === -1) return [item, null]
    used.add(index)
    return [item, after[index]]
  })
  after.forEach((item, i) => {
    if (!used.has(i)) pairs.push([null, item])
  })
  return pairs
}

function diffFields(before, after, path, rows, skip = []) {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ])
  for (const key of keys) {
    if (!SKIPPED_FIELDS.has(key) && !skip.includes(key)) {
      // eslint-disable-next-line no-use-before-define
      diffField(key, before?.[key], after?.[key], path, rows, {
        oneSided: before === null ? 'after' : after === null ? 'before' : '',
      })
    }
  }
}

function diffList(field, before, after, path, rows) {
  const handleClass = HANDLE_FIELDS[field]
  const refClass = REF_LIST_FIELDS[field]
  if (handleClass || before.concat(after).every(item => !isObject(item))) {
    const describeItem = item =>
      handleClass ? refValue(handleClass, item) : describeValue(field, item)
    for (const [b, a] of pairRefs(before, after, item => item)) {
      if (b === null) pushRow(rows, path, null, describeItem(a))
      if (a === null) pushRow(rows, path, describeItem(b), null)
    }
    return
  }
  if (refClass) {
    for (const [b, a] of pairRefs(before, after, item => item?.ref)) {
      const ref = refValue(refClass, (b ?? a).ref)
      if (b === null) pushRow(rows, path, null, ref)
      if (a === null) pushRow(rows, path, ref, null)
      // a removed reference is gone with its details; the details of a new
      // or changed one are part of the change
      if (a !== null) diffFields(b, a, [...path, ref], rows, ['ref'])
    }
    return
  }
  const length = Math.max(before.length, after.length)
  for (let i = 0; i < length; i += 1) {
    diffFields(before[i] ?? null, after[i] ?? null, path, rows)
  }
}

function diffField(field, before, after, path, rows, {oneSided = ''} = {}) {
  if (deepEqual(before, after)) return
  const fieldPath = TRANSPARENT_FIELDS.has(field)
    ? path
    : [...path, FIELD_LABELS[field] ?? field]
  if (Array.isArray(before) || Array.isArray(after)) {
    diffList(field, before ?? [], after ?? [], fieldPath, rows)
    return
  }
  if (field in HANDLE_FIELDS) {
    pushRow(
      rows,
      fieldPath,
      refValue(HANDLE_FIELDS[field], before),
      refValue(HANDLE_FIELDS[field], after)
    )
    return
  }
  if (
    (isObject(before) || isObject(after)) &&
    !isAtomic(before) &&
    !isAtomic(after)
  ) {
    diffFields(before ?? null, after ?? null, fieldPath, rows)
    return
  }
  if (oneSided) {
    pushOneSided(
      rows,
      fieldPath,
      field,
      oneSided === 'after' ? after : before,
      oneSided
    )
    return
  }
  pushRow(
    rows,
    fieldPath,
    describeValue(field, before),
    describeValue(field, after)
  )
}

// Rows of the fields that differ between two states of a record; with no
// state before, the rows of a new record
export function changeRows(before, after) {
  const rows = []
  diffFields(before, after, [], rows)
  return rows
}

const CHANGE_ORDER = {add: 0, update: 1, delete: 2}

// The records a transaction changes, additions first and deletions last,
// each with its rows. A deleted record has no rows: it goes as a whole.
// Updates that change nothing but bookkeeping are left out.
export function proposalChanges(transaction) {
  return (transaction ?? [])
    .map(item => {
      const objClass = item._class.toLowerCase()
      const data = item.type === 'delete' ? item.old : item.new
      return {
        type: item.type,
        objClass,
        handle: item.handle,
        grampsId: data?.gramps_id ?? '',
        data,
        rows: item.type === 'delete' ? [] : changeRows(item.old, item.new),
      }
    })
    .filter(change => change.type !== 'update' || change.rows.length > 0)
    .sort((a, b) => CHANGE_ORDER[a.type] - CHANGE_ORDER[b.type])
}

// What to tell the assistant about its proposals with the next prompt:
// 'applied' if one was applied since it last answered, else 'not_applied' if
// its last answer has a proposal, else ''
export function previousProposalStatus(messages) {
  if (messages.some(message => message.proposalUnreported)) return 'applied'
  const answer = messages.findLast(message => message.role === 'ai')
  return answer?.proposal ? 'not_applied' : ''
}

// The messages once the assistant has been told about applied proposals
export function markProposalsReported(messages) {
  return messages.map(message => {
    if (!message.proposalUnreported) return message
    const {proposalUnreported, ...reported} = message
    return reported
  })
}

// Handles of the records the changes refer to or change, by object class,
// that are not added by the changes themselves and need to be fetched
export function handlesToFetch(changes) {
  const added = new Set(
    changes.filter(c => c.type === 'add').map(c => c.handle)
  )
  const handles = {}
  const add = (objClass, handle) => {
    if (added.has(handle)) return
    handles[objClass] = handles[objClass] ?? new Set()
    handles[objClass].add(handle)
  }
  for (const change of changes) {
    if (change.type !== 'add') add(change.objClass, change.handle)
    for (const row of change.rows) {
      for (const value of [...row.path, row.before, row.after]) {
        if (value?.kind === 'ref') add(value.objClass, value.handle)
      }
    }
  }
  return Object.fromEntries(
    Object.entries(handles).map(([objClass, set]) => [objClass, [...set]])
  )
}

// Modifiers and qualities of Gramps dates
const MOD_BEFORE = 1
const MOD_AFTER = 2
const MOD_ABOUT = 3
const MOD_RANGE = 4
const MOD_SPAN = 5
const MOD_TEXTONLY = 6
const MOD_FROM = 7
const MOD_TO = 8

const QUALITY_STRINGS = {1: 'estimated', 2: 'calculated'}

const CALENDAR_STRINGS = {
  1: 'Julian',
  2: 'Hebrew',
  3: 'French Republican',
  4: 'Persian',
  5: 'Islamic',
  6: 'Swedish',
}

const NEW_YEAR_STRINGS = {1: 'Mar1', 2: 'Mar25', 3: 'Sep1'}

const pad = (number, length) => `${number}`.padStart(length, '0')

// A year as Gramps shows it, a dual year as 1731/2 for the stored 1732
function formatYear(year, dual) {
  const value = Math.abs(year)
  if (!dual) return `${value}`
  const previous = value - 1
  let modulus = 10
  if (previous % 100 === 99) modulus = 1000
  else if (previous % 10 === 9) modulus = 100
  return `${previous}/${value % modulus}`
}

// One half of a dateval as year-month-day, leaving out what is not known
function formatDateval(day, month, year, dual) {
  if (!year && !month && !day) return ''
  const parts = [year ? formatYear(year, dual) : '????']
  if (month) parts.push(pad(month, 2))
  if (month && day) parts.push(pad(day, 2))
  const value = parts.join('-')
  return year < 0 ? `${value} B.C.E.` : value
}

// The new year a date counts from, if not the first of January
function formatNewYear(newyear) {
  if (Array.isArray(newyear)) return newyear.join('-')
  return NEW_YEAR_STRINGS[newyear] ?? ''
}

// A Gramps date as text, with `translate` for its words and
// `translateContext` for those Gramps translates in a context. Dates show in
// the ISO format, the Gramps default, as the backend formats dates of records.
export function formatDate(
  date,
  translate,
  translateContext = (context, s) => translate(s)
) {
  if (!date) return ''
  if (date.modifier === MOD_TEXTONLY) return date.text ?? ''
  if (dateIsEmpty(date)) return ''
  const dv = date.dateval ?? []
  const first = formatDateval(dv[0], dv[1], dv[2], dv[3])
  const second = formatDateval(dv[4], dv[5], dv[6], dv[7])
  let result
  switch (date.modifier) {
    case MOD_BEFORE:
      result = `${translate('before')} ${first}`
      break
    case MOD_AFTER:
      result = `${translate('after')} ${first}`
      break
    case MOD_ABOUT:
      result = `${translate('about')} ${first}`
      break
    case MOD_RANGE:
      result = `${translate('between')} ${first} ${translate('and')} ${second}`
      break
    case MOD_SPAN:
      result = `${translate('from')} ${first} ${translate('to')} ${second}`
      break
    case MOD_FROM:
      result = `${translate('from')} ${first}`
      break
    case MOD_TO:
      result = `${translate('to')} ${first}`
      break
    default:
      result = first
  }
  const quality = QUALITY_STRINGS[date.quality]
  if (quality) result = `${translate(quality)} ${result}`
  const extras = [
    CALENDAR_STRINGS[date.calendar]
      ? translateContext('calendar', CALENDAR_STRINGS[date.calendar])
      : '',
    formatNewYear(date.newyear),
  ].filter(Boolean)
  if (extras.length > 0) result = `${result} (${extras.join(', ')})`
  return result
}
