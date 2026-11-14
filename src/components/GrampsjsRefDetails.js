/*
Read-only dialog with the citations, notes and attributes of a secondary
object, e.g. a participant's link to an event
*/

import {html, css, LitElement} from 'lit'

import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'

import './GrampsjsAttributes.js'
import './GrampsjsSearchResultList.js'
import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'
import {
  participantIntroStyles,
  renderParticipantIntro,
} from './participantRow.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

/*
Fetch the objects with these handles, in their order. A handle that
appears twice is fetched once, and a missing object is left out.
*/
export async function fetchRefObjects(appState, objectType, endpoint, handles) {
  const unique = [...new Set(handles ?? [])]
  const lang = appState.i18n?.lang || 'en'
  const results = await Promise.all(
    unique.map(handle =>
      appState.apiGet(
        `/api/${endpoint}/${handle}?extend=all&profile=all&locale=${lang}`
      )
    )
  )
  const byHandle = Object.fromEntries(
    unique.map((handle, i) => [handle, results[i]?.data])
  )
  return (handles ?? [])
    .filter(handle => byHandle[handle])
    .map(handle => ({
      object_type: objectType,
      handle,
      object: byHandle[handle],
    }))
}

class GrampsjsRefDetails extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      ...participantIntroStyles,
      css`
        md-dialog {
          max-width: 100vw;
          min-width: 50vw;
          max-height: 80vh;
          --md-list-container-color: var(--md-sys-color-surface-container-high);
        }

        h4.label {
          margin-top: 24px;
          margin-bottom: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      dialogTitle: {type: String},
      // a row of participantRefRows
      participant: {type: Object},
      citations: {type: Array},
      notes: {type: Array},
      attributes: {type: Array},
      _citationObjects: {type: Array, state: true},
      _noteObjects: {type: Array, state: true},
      _loading: {type: Boolean, state: true},
    }
  }

  constructor() {
    super()
    this.dialogTitle = ''
    this.participant = {}
    this.citations = []
    this.notes = []
    this.attributes = []
    this._citationObjects = []
    this._noteObjects = []
    this._loading = true
  }

  render() {
    return html`
      <md-dialog
        open
        @cancel="${e => e.preventDefault()}"
        @keydown="${this._handleKeydown}"
      >
        <div slot="headline">${this.dialogTitle}</div>
        <div slot="content">
          ${renderParticipantIntro(this.participant, this.appState, (...args) =>
            this._(...args)
          )}
          ${this.attributes.length
            ? html`
                <h4 class="label">${this._('Attributes')}</h4>
                <grampsjs-attributes
                  .appState="${this.appState}"
                  .data="${this.attributes}"
                ></grampsjs-attributes>
              `
            : ''}
          ${this._renderObjects(
            'Citations',
            this.citations,
            this._citationObjects
          )}
          ${this._renderObjects('Notes', this.notes, this._noteObjects)}
        </div>
        <div slot="actions">
          <md-text-button @click="${this._handleClose}">
            ${this._('Close')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _renderObjects(heading, handles, objects) {
    if (!handles.length) {
      return ''
    }
    return html`
      <h4 class="label">${this._(heading)}</h4>
      <grampsjs-search-result-list
        linked
        noSep
        ?loading="${this._loading}"
        numberLoading="${handles.length}"
        .data="${objects}"
        .appState="${this.appState}"
        @click="${this._handleClose}"
      ></grampsjs-search-result-list>
    `
  }

  firstUpdated() {
    this._fetchObjects()
  }

  async _fetchObjects() {
    const [citations, notes] = await Promise.all([
      fetchRefObjects(this.appState, 'citation', 'citations', this.citations),
      fetchRefObjects(this.appState, 'note', 'notes', this.notes),
    ])
    this._citationObjects = citations
    this._noteObjects = notes
    this._loading = false
  }

  _handleKeydown(e) {
    if (e.key === 'Escape') {
      this._handleClose()
    }
  }

  _handleClose() {
    fireEvent(this, 'object:cancel')
  }
}

window.customElements.define('grampsjs-ref-details', GrampsjsRefDetails)
