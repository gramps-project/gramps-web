import {html} from 'lit'
import '@material/mwc-icon'
import dayjs from 'dayjs/esm'
import relativeTime from 'dayjs/esm/plugin/relativeTime'

import {asteriskIcon, crossIcon, ringsIcon} from './icons.js'


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
  return `${personProfile.name_given || '…'} ${personProfile.name_surname || '…'}`
}


export function familyTitleFromProfile(familyProfile) {
  return `${personTitleFromProfile(familyProfile.father || {})} & ${personTitleFromProfile(familyProfile.mother || {})}`
}


export function citationTitleFromProfile(citationProfile) {
  return `${citationProfile.source?.title || ''}
          ${citationProfile.page ? ` (${citationProfile.page})` : ''}`
}


export function eventTitleFromProfile(eventProfile, strings) {
  const primary = translate(strings, 'Primary')
  const family = translate(strings, 'Family')
  const people = eventProfile?.participants?.people.filter((obj) => obj.role === primary) || []
  const families = eventProfile?.participants?.families.filter((obj) => obj.role === family) || []
  const primaryPeople = `${people.map((obj) => personTitleFromProfile(obj.person)).join(', ')}
          ${families.map((obj) => familyTitleFromProfile(obj.family)).join(', ')}`
  return html`${eventProfile.type}${primaryPeople.trim() ? `: ${primaryPeople}` : ''}${eventProfile.date ? ` (${eventProfile.date})` : ''}`
}


export function renderPerson(personProfile) {
  return html`
  <span class="event">
  <mwc-icon class="inline ${personProfile.sex === 'M' ? 'male' : 'female'}">person</mwc-icon>
  <a href="${BASE_DIR}/person/${personProfile.gramps_id}">${personProfile.name_given || '…'}
  ${personProfile.name_surname || '…'}</a>
  </span>
  ${personProfile?.birth?.date ? html`
    <span class="event"><i>${asteriskIcon}</i> ${personProfile.birth.date}` : ''}
  ${personProfile?.death?.date ? html`
    <span class="event"><i>${crossIcon}</i> ${personProfile.death.date}` : ''}
  `
}


export function getName(obj, type) {
  switch(type) {
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
  switch(type) {
  case 'person':
    return html`
      <mwc-icon class="inline ${obj.gender === 1 ? 'male' : 'female'}">person</mwc-icon>
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


export function prettyTimeDiffTimestamp(timestamp, locale) {
  // pt_PT is the only locale we have to rename
  const dayjsLocale = locale === 'pt_PT' ? 'pt' : locale
  dayjs.locale(dayjsLocale.toLowerCase().replace('_', '-'))
  return dayjs.unix(timestamp).fromNow()
}


export function debounce (func, wait)  {
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
  switch(type) {
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
