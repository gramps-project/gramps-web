/*
The participant of an event as shown in the participants list, for the list
and for the dialogs of a participant's link to the event. `row` is a row of
participantRefRows, `translate` the `_` of the rendering component.
*/

import {html, css} from 'lit'

import '@material/web/list/list.js'
import '@material/web/list/list-item.js'

import {personListItemStyles} from '../SharedStyles.js'
import {renderIcon, renderPrivacyIcon} from '../objectRender.js'

// the content of the md-list-item of a participant
export function renderParticipantRowContent(
  row,
  appState,
  translate,
  {role = true} = {}
) {
  return html`
    ${row.title} ${renderPrivacyIcon(row.privacy, appState)}
    ${role && row.role
      ? html`<span slot="supporting-text">${translate(row.role)}</span>`
      : ''}
    ${renderIcon({object_type: row.object_type, object: row.backlink}, 'start')}
  `
}

export const participantIntroStyles = [
  personListItemStyles,
  css`
    p.intro {
      margin: 0 0 16px 0;
      font-size: var(--md-sys-typescale-body-large-size, 16px);
      line-height: var(--md-sys-typescale-body-large-line-height, 24px);
      font-weight: var(--grampsjs-body-font-weight);
      color: var(--grampsjs-body-font-color);
    }

    md-list.participant {
      padding: 0 0 8px 0;
    }
  `,
]

// the sentence at the top of the dialogs and the participant below it
export function renderParticipantIntro(row, appState, translate, options) {
  return html`
    <p class="intro">
      ${translate(
        row.object_type === 'family'
          ? 'The information below applies to this family in this event.'
          : 'The information below applies to this person in this event.'
      )}
    </p>
    <md-list class="participant">
      <md-list-item type="text">
        ${renderParticipantRowContent(row, appState, translate, options)}
      </md-list-item>
    </md-list>
  `
}
