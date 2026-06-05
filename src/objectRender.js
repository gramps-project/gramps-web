import {html} from 'lit'
import '@material/mwc-icon'

import {asteriskIcon, crossIcon} from './icons.js'
import {hex6ToCss, hex12ToCss} from './color.js'
import {
  familyTitleFromProfile,
  eventTitleFromProfile,
  citationTitleFromProfile,
  getName,
  translate,
  objectIconPath,
  eventTypeStrings,
  noteTypeStrings,
} from './util.js'
import './components/GrampsjsObjectLink.js'
import './components/GrampsjsImg.js'
import './components/GrampsjsIcon.js'

// Replaced at build time by rollup
const BASE_DIR = ''

export function renderPerson(personProfile) {
  return html`
    <span class="event">
      <mwc-icon class="inline ${personProfile.sex === 'M' ? 'male' : 'female'}"
        >person</mwc-icon
      >
      <grampsjs-object-link
        object-type="person"
        gramps-id="${personProfile.gramps_id}"
        >${personProfile.name_given || '…'}
        ${personProfile.name_surname || '…'}</grampsjs-object-link
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

export function showObject(type, obj, strings) {
  switch (type) {
    case 'person':
      return html`
        <mwc-icon class="inline ${obj.gender === 1 ? 'male' : 'female'}"
          >person</mwc-icon
        >
        <grampsjs-object-link object-type="person" gramps-id="${obj.gramps_id}"
          >${obj?.profile?.name_given || html`&hellip;`}
          ${obj?.profile?.name_surname || html`&hellip;`}
        </grampsjs-object-link>
      `
    case 'family':
      return html`
        <mwc-icon class="inline">people</mwc-icon>
        <grampsjs-object-link object-type="family" gramps-id="${obj.gramps_id}"
          >${familyTitleFromProfile(obj.profile || {}) || type}
        </grampsjs-object-link>
      `
    case 'event':
      return html`
        <mwc-icon class="inline">event</mwc-icon>
        <a href="${BASE_DIR}/${type}/${obj.gramps_id}"
          >${eventTitleFromProfile(obj.profile || {}) ||
          (typeof obj.type === 'string'
            ? obj.type
            : obj.type?.string || eventTypeStrings[obj.type?.value] || type)}
        </a>
      `
    case 'place':
      return html`
        <mwc-icon class="inline">place</mwc-icon>
        <grampsjs-object-link object-type="place" gramps-id="${obj.gramps_id}"
          >${obj?.profile?.name || obj?.name?.value || obj.title || type}
        </grampsjs-object-link>
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
          >${translate(
            strings,
            typeof obj.type === 'string'
              ? obj.type
              : obj.type?.string || noteTypeStrings[obj.type?.value] || ''
          ) || type}
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

function _getMediaChecksum(obj) {
  if (obj.object_type === 'media') {
    return obj.object.checksum || ''
  }
  if (obj.object?.media_list?.length) {
    const ref = obj.object.media_list[0].ref
    const mediaObj = obj.object.extended?.media?.find(m => m.handle === ref)
    return mediaObj?.checksum || ''
  }
  return ''
}

export function renderIcon(obj, slot = 'graphic', iconPath = null) {
  const handle = _getMediaHandle(obj)
  const rect = _getMediaRect(obj)
  const checksum = _getMediaChecksum(obj)
  if (handle) {
    return html`<grampsjs-img
      handle="${handle}"
      slot="${slot}"
      circle
      square
      size="40"
      .rect="${rect}"
      mime=""
      checksum="${checksum}"
      fallbackIcon="${objectIconPath[obj.object_type]}"
    ></grampsjs-img>`
  }
  if (obj.object_type === 'tag') {
    const color =
      obj.object?.color?.length > 7
        ? hex12ToCss(obj.object.color, 0.6)
        : hex6ToCss(obj.object.color, 0.6)
    return html`<grampsjs-icon
      slot="${slot}"
      path="${objectIconPath[obj.object_type]}"
      color="var(--grampsjs-color-icon)"
      style="background-color:${color};"
    ></grampsjs-icon>`
  }
  return html`<grampsjs-icon
    slot="${slot}"
    path="${iconPath || objectIconPath[obj.object_type]}"
    color="var(--grampsjs-color-icon)"
  ></grampsjs-icon>`
}
