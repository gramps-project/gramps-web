/* eslint-disable no-bitwise */
import {html} from 'lit'
import '@material/mwc-icon'
import dayjs from 'dayjs/esm'
import relativeTime from 'dayjs/esm/plugin/relativeTime'

import {asteriskIcon, crossIcon} from './icons.js'
import {additionalStrings} from './strings.js'

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
  }`
}

export function familyTitleFromProfile(familyProfile) {
  return `${personTitleFromProfile(
    familyProfile.father || {}
  )} & ${personTitleFromProfile(familyProfile.mother || {})}`
}

export function citationTitleFromProfile(citationProfile) {
  return `${citationProfile.source?.title || ''}
          ${citationProfile.page ? ` (${citationProfile.page})` : ''}`
}

export function eventTitleFromProfile(eventProfile, strings) {
  if (eventProfile.summary) {
    return html`${eventProfile.summary}${eventProfile.date
      ? ` (${eventProfile.date})`
      : ''}`
  }
  // the code below is only kept for backward compatibility
  const primary = translate(strings, 'Primary')
  const family = translate(strings, 'Family')
  const people =
    eventProfile?.participants?.people.filter(
      obj => obj.role === primary || obj.role === 'Primary'
    ) || []
  const families =
    eventProfile?.participants?.families.filter(
      obj => obj.role === family || obj.role === 'Family'
    ) || []
  const primaryPeople = `${people
    .map(obj => personTitleFromProfile(obj.person))
    .join(', ')}
          ${families.map(obj => familyTitleFromProfile(obj.family)).join(', ')}`
  return html`${eventProfile.type}${primaryPeople.trim()
    ? `: ${primaryPeople}`
    : ''}${eventProfile.date ? ` (${eventProfile.date})` : ''}`
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
      return html`${obj?.profile?.name_given || html`&hellip;`}
      ${obj?.profile?.name_surname || html`&hellip;`}`
    case 'family':
      return html`${familyTitleFromProfile(obj.profile || {}) || type}`
    case 'event':
      return html`${eventTitleFromProfile(obj.profile || {}, strings) ||
      obj.type}`
    case 'place':
      return html`${obj?.profile?.name ||
      obj?.name?.value ||
      obj.title ||
      type}`
    case 'source':
      return html`${getName(obj, type) || type}`
    case 'citation':
      return html`${citationTitleFromProfile(obj.profile || {}) || type}`
    case 'repository':
      return html`${getName(obj, type) || type}`
    case 'note':
      return html`${translate(strings, obj.type) || type}`
    case 'media':
      return html`${getName(obj, type) || type}`
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
    ${obj?.profile?.birth?.date ? `* ${obj.profile.birth.date}` : ''}
    ${obj?.profile?.birth?.place && obj?.profile?.birth?.date ? ', ' : ''}
    ${obj?.profile?.birth?.place || ''}
    `
    // case 'family':
    //   return ''
    case 'event':
      return `
    ${obj?.profile?.date || ''}
    ${obj?.profile?.place && obj?.profile?.date ? ', ' : ''}
    ${obj?.profile?.place || ''}
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
    // case 'note':
    //   return ''
    // case 'media':
    //   return ''
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
  return Math.ceil(2440587.5 + Date.UTC(year, month - 1, day) / 86400000)
}

export function getBrowserLanguage() {
  // get browser language and replace all '-' with '_'
  // since the strings from backend comes with underscore
  const browserLang = navigator.language.replaceAll('-', '_')
  if (browserLang in additionalStrings) {
    return browserLang
  }
  if (browserLang.split('_')[0] in additionalStrings) {
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
