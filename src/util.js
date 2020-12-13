import {html} from 'lit-element'

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
