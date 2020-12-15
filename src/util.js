import {html} from 'lit-element'

import '@material/mwc-icon'

import {asteriskIcon, crossIcon, ringsIcon} from './icons.js'


export function renderPerson(personProfile) {
  return html`
  <span class="event">
  <mwc-icon class="inline ${personProfile.sex === 'M' ? 'male' : 'female'}">person</mwc-icon>
  <a href="/person/${personProfile.gramps_id}">${personProfile.name_given || '…'}
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
    return obj.description
  case 'family':
    return ''
  case 'place':
    return obj.title
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


export function showObject(type, obj) {
  switch(type) {
  case 'person':
    return html`
      <mwc-icon class="inline ${obj.gender === 1 ? 'male' : 'female'}">person</mwc-icon>
      <a href="/${type}/${obj.gramps_id}"
      >${obj?.profile?.name_given || html`&hellip;`}
      ${obj?.profile?.name_surname || html`&hellip;`}
      </a>
    `
  case 'family':
    return html`
      <mwc-icon class="inline">people</mwc-icon>
      <a href="/${type}/${obj.gramps_id}"
      >${getName(obj, type) || type}
      </a>
    `
  case 'event':
    return html`
      <mwc-icon class="inline">event</mwc-icon>
      <a href="/${type}/${obj.gramps_id}"
      >${getName(obj, type) || type}
      </a>
    `
  case 'place':
    return html`
      <mwc-icon class="inline">place</mwc-icon>
      <a href="/${type}/${obj.gramps_id}"
      >${getName(obj, type) || type}
      </a>
    `
  case 'source':
    return html`
      <mwc-icon class="inline">bookmarks</mwc-icon>
      <a href="/${type}/${obj.gramps_id}"
      >${getName(obj, type) || type}
      </a>
    `
  case 'citation':
    return html`
      <mwc-icon class="inline">bookmark</mwc-icon>
      <a href="/${type}/${obj.gramps_id}"
      >${getName(obj, type) || type}
      </a>
    `
  case 'repository':
    return html`
      <mwc-icon class="inline">account_balance</mwc-icon>
      <a href="/${type}/${obj.gramps_id}"
      >${getName(obj, type) || type}
      </a>
    `
  case 'note':
    return html`
        <mwc-icon class="inline">sticky_note_2</mwc-icon>
        <a href="/${type}/${obj.gramps_id}"
        >${getName(obj, type) || type}
        </a>
      `
  case 'media':
    return html`
        <mwc-icon class="inline">photo</mwc-icon>
        <a href="/mediaobject/${obj.gramps_id}"
        >${getName(obj, type) || type}
        </a>
        `
  default:
    return `unknown type: ${type}`
  }
}
