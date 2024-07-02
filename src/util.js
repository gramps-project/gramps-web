/* eslint-disable no-bitwise */
import {html} from 'lit'
import '@material/mwc-icon'
import dayjs from 'dayjs/esm'
import relativeTime from 'dayjs/esm/plugin/relativeTime'

import {asteriskIcon, crossIcon} from './icons.js'
import {frontendLanguages} from './strings.js'
import {hex6ToCss, hex12ToCss} from './color.js'

dayjs.extend(relativeTime)

const BASE_DIR = ''

export function translate(strings, s) {
  if (s === undefined) {
    return ''
  }
  if (s in strings) {
    return strings[s].replace('_', '')
  }
  return s.replace('_', '')
}

export function personTitleFromProfile(personProfile) {
  return `${personProfile.name_given || '…'} ${
    personProfile.name_surname || '…'
  } ${personProfile.name_suffix || ''}`.trim()
}

function displaySurname(surname) {
  return `${surname.prefix} ${surname.surname} ${surname.connector}`.trim()
}

export function personDisplayName(person, options = {givenfirst: true}) {
  const suffix = person.primary_name?.suffix ?? ''
  const given = person.primary_name?.first_name ?? '…'
  const surname =
    person.primary_name?.surname_list?.map(displaySurname)?.join(' ') ?? '…'
  return options.givenfirst
    ? `${given} ${surname} ${suffix}`.trim()
    : `${surname}, ${given} ${suffix}`.trim()
}

export function familyTitleFromProfile(familyProfile) {
  if (!familyProfile.father && !familyProfile.mother) {
    return ''
  }
  return `${personTitleFromProfile(
    familyProfile.father || {}
  )} & ${personTitleFromProfile(familyProfile.mother || {})}`
}

export function citationTitleFromProfile(citationProfile) {
  if (!citationProfile.source?.title) {
    return ''
  }
  return `${citationProfile.source?.title || ''}
          ${citationProfile.page ? ` (${citationProfile.page})` : ''}`
}

export function eventTitleFromProfile(eventProfile, date = true) {
  if (eventProfile.summary) {
    return html`${eventProfile.summary}${date && eventProfile.date
      ? ` (${eventProfile.date})`
      : ''}`
  }
  return ''
}

export function renderPerson(personProfile) {
  return html`
    <span class="event">
      <mwc-icon class="inline ${personProfile.sex === 'M' ? 'male' : 'female'}"
        >person</mwc-icon
      >
      <a href="${BASE_DIR}/person/${personProfile.gramps_id}"
        >${personProfile.name_given || '…'}
        ${personProfile.name_surname || '…'}</a
      >
    </span>
    ${personProfile?.birth?.date
      ? html` <span class="event"
          ><i>${asteriskIcon}</i> ${personProfile.birth.date}</span
        >`
      : ''}
    ${personProfile?.death?.date
      ? html` <span class="event"
          ><i>${crossIcon}</i> ${personProfile.death.date}</span
        >`
      : ''}
  `
}

export function getName(obj, type) {
  switch (type) {
    case 'person':
      return obj?.primary_name?.first_name
    case 'event':
      return obj.type
    case 'family':
      return ''
    case 'place':
      return obj?.name?.value || obj.title
    case 'source':
      return obj.title
    case 'repository':
      return obj.name
    case 'citation':
      return obj.page
    case 'media':
      return obj.desc
    default:
      return ''
  }
}

export function showObject(type, obj, strings) {
  switch (type) {
    case 'person':
      return html`
        <mwc-icon class="inline ${obj.gender === 1 ? 'male' : 'female'}"
          >person</mwc-icon
        >
        <a href="${BASE_DIR}/${type}/${obj.gramps_id}"
          >${obj?.profile?.name_given || html`&hellip;`}
          ${obj?.profile?.name_surname || html`&hellip;`}
        </a>
      `
    case 'family':
      return html`
        <mwc-icon class="inline">people</mwc-icon>
        <a href="${BASE_DIR}/${type}/${obj.gramps_id}"
          >${familyTitleFromProfile(obj.profile || {}) || type}
        </a>
      `
    case 'event':
      return html`
        <mwc-icon class="inline">event</mwc-icon>
        <a href="${BASE_DIR}/${type}/${obj.gramps_id}"
          >${eventTitleFromProfile(obj.profile || {}, strings) || obj.type}
        </a>
      `
    case 'place':
      return html`
        <mwc-icon class="inline">place</mwc-icon>
        <a href="${BASE_DIR}/${type}/${obj.gramps_id}"
          >${obj?.profile?.name || obj?.name?.value || obj.title || type}
        </a>
      `
    case 'source':
      return html`
        <mwc-icon class="inline">bookmarks</mwc-icon>
        <a href="${BASE_DIR}/${type}/${obj.gramps_id}"
          >${getName(obj, type) || type}
        </a>
      `
    case 'citation':
      return html`
        <mwc-icon class="inline">bookmark</mwc-icon>
        <a href="${BASE_DIR}/${type}/${obj.gramps_id}"
          >${citationTitleFromProfile(obj.profile || {}) || type}
        </a>
      `
    case 'repository':
      return html`
        <mwc-icon class="inline">account_balance</mwc-icon>
        <a href="${BASE_DIR}/${type}/${obj.gramps_id}"
          >${getName(obj, type) || type}
        </a>
      `
    case 'note':
      return html`
        <mwc-icon class="inline">sticky_note_2</mwc-icon>
        <a href="${BASE_DIR}/${type}/${obj.gramps_id}"
          >${translate(strings, obj.type) || type}
        </a>
      `
    case 'media':
      return html`
        <mwc-icon class="inline">photo</mwc-icon>
        <a href="${BASE_DIR}/media/${obj.gramps_id}"
          >${getName(obj, type) || type}
        </a>
      `
    case 'tag':
      return html``
    default:
      return `unknown type: ${type}`
  }
}

export const objectIcon = {
  person: 'person',
  family: 'people',
  event: 'event',
  place: 'place',
  source: 'bookmarks',
  citation: 'bookmark',
  repository: 'account_balance',
  note: 'sticky_note_2',
  media: 'photo',
  tag: 'label',
}

export const objectTypeToEndpoint = {
  person: 'people',
  family: 'families',
  event: 'events',
  place: 'places',
  source: 'sources',
  citation: 'citations',
  repository: 'repositories',
  note: 'notes',
  media: 'media',
  tag: 'tags',
}

export function objectDescription(type, obj, strings) {
  switch (type) {
    case 'person':
      return personDisplayName(obj)
    case 'family':
      return html`${familyTitleFromProfile(obj.profile || {}) ||
      translate(strings, 'Family')}`
    case 'event':
      return html`${eventTitleFromProfile(obj.profile || {}, strings, false) ||
      translate(strings, obj.type.string ?? obj.type)}`
    case 'place':
      return html`${obj?.profile?.name ||
      obj?.name?.value ||
      obj.title ||
      type}`
    case 'source':
      return html`${getName(obj, type) || type}`
    case 'citation':
      return html`${citationTitleFromProfile(obj.profile || {}) ||
      translate(strings, 'Citation')}`
    case 'repository':
      return html`${getName(obj, type) || type}`
    case 'note':
      return html`${translate(strings, obj.type.string ?? obj.type) || type}`
    case 'media':
      return html`${getName(obj, type) || translate(strings, 'Media Object')}`
    case 'tag':
      return html`${obj.name}`
    default:
      return `unknown type: ${type}`
  }
}

export function objectDetail(type, obj, strings) {
  switch (type) {
    case 'person':
      return `
    ${obj?.profile?.birth?.date ? `* ${obj.profile.birth.date}` : ''}${
        obj?.profile?.birth?.place && obj?.profile?.birth?.date ? ', ' : ''
      }${obj?.profile?.birth?.place || ''}
    `
    // case 'family':
    //   return ''
    case 'event':
      return `
    ${obj?.profile?.date || ''}${
        obj?.profile?.place && obj?.profile?.date ? ', ' : ''
      }${obj?.profile?.place || ''}
    `
    case 'place':
      return `
    ${obj?.profile?.type ? obj.profile.type : ''}
    `
    // case 'source':
    //   return ''
    // case 'citation':
    //   return ''
    case 'repository':
      return `
    ${obj.type ? translate(strings, obj.type) : ''}
    `
    case 'note':
      return obj?.text?.string || ''
    case 'media':
      if (obj.mime?.startsWith('audio')) {
        return translate(strings, 'Audio')
      }
      if (obj.mime?.startsWith('video')) {
        return translate(strings, 'Video')
      }
      if (obj.mime?.startsWith('image')) {
        return translate(strings, 'Image')
      }
      if (obj.mime === 'application/pdf') {
        return translate(strings, 'PDF')
      }
      return obj.mime || ''
    // case 'tag':
    //   return ''
    default:
      return ''
  }
}

export function prettyTimeDiffTimestamp(timestamp, locale) {
  // pt_PT is the only locale we have to rename
  const dayjsLocale = locale === 'pt_PT' ? 'pt' : locale
  dayjs.locale(dayjsLocale.toLowerCase().replace('_', '-'))
  return dayjs.unix(timestamp).fromNow()
}

export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function getNameFromProfile(obj, type, strings) {
  switch (type) {
    case 'person':
      return personTitleFromProfile(obj)
    case 'event':
      return eventTitleFromProfile(obj, strings)
    case 'family':
      return familyTitleFromProfile(obj)
    case 'place':
      return obj.name
    case 'source':
      return obj.title
    case 'repository':
      return obj.name
    case 'citation':
      return citationTitleFromProfile(obj)
    case 'media':
      return obj.desc
    default:
      return ''
  }
}

export function fireEvent(target, name, detail) {
  target.dispatchEvent(
    new CustomEvent(name, {bubbles: true, composed: true, detail})
  )
}

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  )
}

export function makeHandle() {
  return uuidv4()
}

// Gregorian date to Julian day needed for Date.sortval
export function getSortval(year, month, day) {
  if (year === 0 && month === 0 && day === 0) {
    // we're assuming that this is an invalid/empty date!
    return 0
  }
  return Math.ceil(2440587.5 + Date.UTC(year, month - 1, day) / 86400000)
}

export function getBrowserLanguage() {
  // get browser language and replace all '-' with '_'
  // since the strings from backend comes with underscore
  const browserLang = navigator.language.replaceAll('-', '_')
  if (frontendLanguages.includes(browserLang)) {
    return browserLang
  }
  if (frontendLanguages.includes(browserLang.split('_')[0])) {
    return browserLang.split('_')[0]
  }
  return null
}

// return translated date span
export function dateSpanLocal(date1, date2, lang) {
  const localStrings = {
    ar: 'بين 1111 و 2222',
    bg: 'между 1111 и 2222',
    ca: 'entre 1111 i 2222',
    cs: 'mezi 1111 a 2222',
    da: 'mellem 1111 og 2222',
    de: 'zwischen 1111 und 2222',
    el: 'μεταξύ 1111 και 2222',
    en: 'between 1111 and 2222',
    en_GB: 'between 1111 and 2222',
    es: 'entre 1111 y 2222',
    fi: '1111 ja 2222 välillä',
    fr: 'entre 1111 et 2222',
    hr: 'između 1111 i 2222',
    hu: '1111 és 2222 között',
    is: 'milli 1111 og 2222',
    it: 'tra 1111 e 2222',
    ja: '1111と2222の間',
    lt: 'tarp 1111 ir 2222',
    nb: 'mellom 1111 og 2222',
    nl: 'tussen 1111 en 2222',
    nn: 'mellom 1111 og 2222',
    pl: 'między 1111 a 2222',
    pt_BR: 'entre 1111 e 2222',
    pt_PT: 'entre 1111 e 2222',
    ru: 'между 1111 и 2222',
    sk: 'medzi 1111 a 2222',
    sl: 'med 1111 in 2222',
    sr: 'између 1111 и 2222',
    sv: 'mellan 1111 och 2222',
    uk: 'між 1111 та 2222',
    zh_CN: ' 介于 1111 与 2222 之间',
    zh_HK: ' 介于 1111 与 2222 之间',
    zh_TW: ' 介于 1111 与 2222 之间',
  }
  let str = localStrings[lang]
  if (!str) {
    const candidates = Object.keys(localStrings).filter(key =>
      key.startsWith(lang)
    )
    if (candidates.length === 0) {
      return null
    }
    str = localStrings[candidates[0]]
  }
  return str.replace('1111', date1).replace('2222', date2)
}

export const personFilter = {
  IsFemale: 'Females',
  HasUnknownGender: 'People with unknown gender',
  IsMale: 'Males',
  HasAlternateName: 'People with an alternate name',
  HasNickname: 'People with a nickname',
  HaveAltFamilies: 'Adopted people',
  HaveChildren: 'People with children',
  IncompleteNames: 'People with incomplete names',
  NeverMarried: 'People with no marriage records',
  MultipleMarriages: 'People with multiple marriage records',
  NoBirthdate: 'People without a known birth date',
  NoDeathdate: 'People without a known death date',
  PersonWithIncompleteEvent: 'People with incomplete events',
  FamilyWithIncompleteEvent: 'Families with incomplete events',
  PeoplePrivate: 'People marked private',
  PeoplePublic: 'People not marked private',
  MissingParent: 'People missing parents',
  Disconnected: 'Disconnected people',
}

export const filterCounts = {
  citations: {
    HasGallery: 'Citations with <count> media',
    HasNote: 'Citations having <count> notes',
  },
  events: {
    HasGallery: 'Events with <count> media',
    HasNote: 'Events having <count> notes',
    HasSourceCount: 'Events with <count> sources',
  },
  families: {
    HasGallery: 'Families with <count> media',
    HasNote: 'Families having <count> notes',
    HasSourceCount: 'Families with <count> sources',
  },
  media: {HasSourceCount: 'Media with <count> sources'},
  notes: {},
  people: {
    HavePhotos: 'People with <count> media',
    HasNote: 'People having <count> notes',
    HasSourceCount: 'People with <count> sources',
    HasAddress: 'People with <count> addresses',
    HasAssociation: 'People with <count> associations',
  },
  places: {
    HasGallery: 'Places with <count> media',
    HasNote: 'Places having <count> notes',
    HasSourceCount: 'Place with <count> sources',
  },
  repositories: {},
  sources: {
    HasGallery: 'Sources with <count> media',
    HasNote: 'Sources having <count> notes',
    HasRepository: 'Sources with <count> Repository references',
  },
}

export const filterMime = {
  'image/': 'Image',
  'audio/': 'Audio',
  'video/': 'Video',
  'text/': 'Text',
  'application/pdf': 'PDF',
}

export const reportCategoryIcon = {
  0: 'description', // text
  1: 'pie_chart', // draw
  // 2: '',  // code
  // 3: '',  // web
  // 4: '',  // book
  5: 'account_tree', // graphviz
  // 6: '',  // tree
}

export function arrayEqual(A, B) {
  return A.length > 0 && B.length > 0 && A.every(e => B.includes(e))
}

function _getMediaHandle(obj) {
  if (obj.object_type === 'media') {
    return obj.object.handle
  }
  if (obj.object?.media_list?.length) {
    return obj.object.media_list[0].ref
  }
  return ''
}

function _getMediaRect(obj) {
  if (obj.object?.media_list?.length) {
    return obj.object.media_list[0].rect
  }
  return []
}

export function renderIcon(obj) {
  const handle = _getMediaHandle(obj)
  const rect = _getMediaRect(obj)
  if (handle) {
    return html`<grampsjs-img
      handle="${handle}"
      slot="graphic"
      circle
      square
      size="70"
      .rect="${rect}"
      .mime=""
      ><mwc-icon class="placeholder"
        >${objectIcon[obj.object_type]}</mwc-icon
      ></grampsjs-img
    >`
  }
  if (obj.object_type === 'tag') {
    const color =
      obj.object?.color?.length > 7
        ? hex12ToCss(obj.object.color, 0.6)
        : hex6ToCss(obj.object.color, 0.6)
    return html`<mwc-icon slot="graphic" style="background-color:${color};"
      >${objectIcon[obj.object_type]}</mwc-icon
    >`
  }
  return html`<mwc-icon slot="graphic"
    >${objectIcon[obj.object_type]}</mwc-icon
  >`
}

export function clickKeyHandler(event) {
  if (event.code === 'Enter' || event.code === 'Space') {
    event.target.click()
    event.preventDefault()
    event.stopPropagation()
  }
}

export function dateIsEmpty(date) {
  if (date === undefined) {
    return true
  }
  if (date.modifier === 6) {
    // Text Only Date is never empty
    return false
  }
  if (JSON.stringify(date.dateval.slice(0, 4)) !== '[0,0,0,false]') {
    return false
  }
  if (
    date.dateval.len > 4 &&
    JSON.stringify(date.dateval.slice(4)) !== '[0,0,0,false]'
  ) {
    return false
  }
  return true
}

// OpenHistoricalMap functions

/**
 * Returns a `Date` object representing the given UTC date components.
 *
 * @param year A one-based year in the proleptic Gregorian calendar.
 * @param month A zero-based month.
 * @param day A one-based day.
 * @returns A date object.
 */
function dateFromUTC(year, month, day) {
  const date = new Date(Date.UTC(year, month, day))
  // Date.UTC() treats a two-digit year as an offset from 1900.
  date.setUTCFullYear(year)
  return date
}

/**
 * Converts the given ISO 8601-1 date to a decimal year.
 *
 * @param isoDate A date string in ISO 8601-1 format.
 * @returns A floating point number of years since year 0.
 */
function decimalYearFromISODate(isoDate) {
  // Require a valid YYYY, YYYY-MM, or YYYY-MM-DD date, but allow the year
  // to be a variable number of digits or negative, unlike ISO 8601-1.
  if (!isoDate || !/^-?\d{1,4}(?:-\d\d){0,2}$/.test(isoDate)) return undefined

  const ymd = isoDate.split('-')
  // A negative year results in an extra element at the beginning.
  if (ymd[0] === '') {
    ymd.shift()
    ymd[0] *= -1
  }
  const year = +ymd[0]
  const date = dateFromUTC(year, +ymd[1] - 1, +ymd[2])
  if (Number.isNaN(date)) return undefined

  // Add the year and the fraction of the date between two New Year’s Days.
  const nextNewYear = dateFromUTC(year + 1, 0, 1).getTime()
  const lastNewYear = dateFromUTC(year, 0, 1).getTime()
  return year + (date.getTime() - lastNewYear) / (nextNewYear - lastNewYear)
}

/**
 * Returns a modified version of the given filter that only evaluates to
 * true if the feature coincides with the given decimal year.
 *
 * @param filter The original layer filter.
 * @param decimalYear The decimal year to filter by.
 * @returns A filter similar to the given filter, but with added conditions
 *	that require the feature to coincide with the decimal year.
 */
function constrainFilterByDate(filter, decimalYear) {
  const newFilter = filter
  if (filter && filter[0] === 'all' && filter[1] && filter[1][0] === 'any') {
    if (
      filter[1][2] &&
      filter[1][2][0] === '<=' &&
      filter[1][2][1] === 'start_decdate'
    ) {
      newFilter[1][2][2] = decimalYear
    }
    if (
      newFilter[2][2] &&
      newFilter[2][2][0] === '>=' &&
      newFilter[2][2][1] === 'end_decdate'
    ) {
      newFilter[2][2][2] = decimalYear
    }
    return newFilter
  }

  const dateFilter = [
    'all',
    ['any', ['!has', 'start_decdate'], ['<=', 'start_decdate', decimalYear]],
    ['any', ['!has', 'end_decdate'], ['>=', 'end_decdate', decimalYear]],
  ]
  if (filter) {
    dateFilter.push(filter)
  }
  return dateFilter
}

/**
 * Filters the map’s features by the `date` data attribute.
 *
 * @param map The MapboxGL map object to filter the style of.
 * @param year The numeric ear to filter by
 */
export function filterByDecimalYear(map, decimalYear) {
  // eslint-disable-next-line array-callback-return
  map.getStyle().layers.map(layer => {
    if (!('source-layer' in layer)) return

    const filter = constrainFilterByDate(layer.filter, decimalYear)
    map.setFilter(layer.id, filter)
  })
}

/**
 * Filters the map’s features by the `date` data attribute.
 *
 * @param map The MapboxGL map object to filter the style of.
 * @param date The date to filter by in YYYY-MM-DD format.
 */
export function filterByDate(map, dateP) {
  let date = dateP
  if (date === null || date === '') {
    ;[date] = new Date().toISOString().split('T')
  }
  const decimalYear = date && decimalYearFromISODate(date)
  if (!decimalYear) return

  filterByDecimalYear(map, decimalYear)
}
