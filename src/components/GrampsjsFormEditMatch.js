import {html, css, LitElement} from 'lit'
import {GrampsjsEditMatchMixin} from '../mixins/GrampsjsEditMatchMixin.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import {matchAssociation, matchSegmentNoteHandles} from '../dnaMatch.js'
import './GrampsjsFormPrivate.js'

import {fireEvent, toWritableObject} from '../util.js'

export class GrampsjsFormEditMatch extends GrampsjsEditMatchMixin(
  GrampsjsAppStateMixin(LitElement)
) {
  static get properties() {
    return {
      // handle of the person whose association records the match
      personHandle: {type: String},
      // the association that records the match
      association: {type: Object},
      // the privacy chosen with the switch, null until it is switched
      _private: {type: Boolean},
      // whether a note with the segments is private
      _notePrivate: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.personHandle = ''
    this.association = null
    this._private = null
    this._notePrivate = false
    // Keep a stable listener reference so global edit-mode hooks can be removed.
    this._boundHandleSaveButton = this._handleSaveButton.bind(this)
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        md-outlined-text-field {
          width: 100%;
        }
      `,
    ]
  }

  get isValid() {
    return this.isFormValid
  }

  // The match is private if the association or a note with its segments is,
  // so that saving makes both private
  get _isPrivate() {
    return this._private ?? (!!this.association?.private || this._notePrivate)
  }

  render() {
    return html`
      <div @formdata:changed="${this._handleFormData}">
        ${this.renderEditor()}
        <p>
          <grampsjs-form-private
            id="private"
            ?checked="${this._isPrivate}"
            .appState="${this.appState}"
          ></grampsjs-form-private>
        </p>
        ${this.renderPreview()}
      </div>
    `
  }

  firstUpdated() {
    this._loadNotePrivacy()
  }

  async _loadNotePrivacy() {
    const notes = await Promise.all(
      matchSegmentNoteHandles(this.association, this.data).map(handle =>
        this.appState.apiGet(`/api/notes/${handle}`)
      )
    )
    this._notePrivate = notes.some(note => note.data?.private)
  }

  _handleFormData(e) {
    if (e.composedPath()[0].id === 'private') {
      this._private = e.detail.checked
      return
    }
    this.data = {...this.data, raw_data: [e.detail.data]}
    this.checkFormValidity()
  }

  // The writes do not announce the database change, since the view would
  // reload and remove this form while it is saving. Edit mode ends and the
  // change is announced after the last write, while the form is connected.
  async _handleSaveButton() {
    const changed = await this._save()
    fireEvent(this, 'edit-mode:off')
    if (changed) {
      fireEvent(this, 'db:changed')
    }
  }

  // Saves the raw data and the privacy, and returns whether anything changed.
  // The privacy follows the switch, or else the saved association and notes,
  // which are read before anything is written. The notes are written before
  // the association and the save stops at the first error, so a failed save
  // never hides the match while a note with its segments stays public.
  async _save() {
    const match = this.data
    const noteText = match.raw_data?.[0]
    const textHandle = noteText ? match.note_handles?.[0] : undefined

    const person = await this._fetchWritable(`/api/people/${this.personHandle}`)
    if (person === null) return false
    const association = matchAssociation(person, match)
    const privacyHandles = matchSegmentNoteHandles(association, match)
    const handles = [...new Set([textHandle, ...privacyHandles])].filter(
      Boolean
    )
    const notes = await Promise.all(
      handles.map(handle => this._fetchWritable(`/api/notes/${handle}`))
    )
    if (notes.includes(null)) return false

    const isPrivate =
      this._private ??
      (!!association?.private ||
        notes.some(
          (note, i) => privacyHandles.includes(handles[i]) && note.private
        ))

    let changed = false
    for (const [i, handle] of handles.entries()) {
      const note = notes[i]
      const textChanged = handle === textHandle
      const privacyChanged =
        privacyHandles.includes(handle) && !!note.private !== isPrivate
      if (textChanged || privacyChanged) {
        // eslint-disable-next-line no-await-in-loop
        const saved = await this._put(`/api/notes/${handle}`, {
          ...note,
          ...(textChanged && {
            text: {_class: 'StyledText', string: noteText, tags: []},
          }),
          ...(privacyChanged && {private: isPrivate}),
        })
        if (!saved) return changed
        changed = true
      }
    }

    if (association !== null && !!association.private !== isPrivate) {
      const index = match.person_ref_idx
      const saved = await this._put(`/api/people/${this.personHandle}`, {
        ...person,
        person_ref_list: person.person_ref_list.map((ref, i) =>
          i === index ? {...ref, private: isPrivate} : ref
        ),
      })
      changed = changed || saved
    }
    return changed
  }

  // The object at `url` without its read-only parts, or null after reporting
  // an error
  async _fetchWritable(url) {
    const data = await this.appState.apiGet(url)
    if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
      return null
    }
    return toWritableObject(data.data)
  }

  // Writes `object` to `url` without announcing the change, and returns
  // whether it was saved
  async _put(url, object) {
    const data = await this.appState.apiPut(url, object, {dbChanged: false})
    if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
      return false
    }
    return true
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('edit-mode:save', this._boundHandleSaveButton)
  }

  disconnectedCallback() {
    window.removeEventListener('edit-mode:save', this._boundHandleSaveButton)
    super.disconnectedCallback()
  }
}

window.customElements.define('grampsjs-form-edit-match', GrampsjsFormEditMatch)
