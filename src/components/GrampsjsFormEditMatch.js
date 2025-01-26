import {html, css, LitElement} from 'lit'
import {GrampsjsEditMatchMixin} from '../mixins/GrampsjsEditMatchMixin.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import {apiGet, apiPut} from '../api.js'
import {fireEvent} from '../util.js'

export class GrampsjsFormEditMatch extends GrampsjsEditMatchMixin(
  GrampsjsTranslateMixin(LitElement)
) {
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

  render() {
    return html`
      <div @formdata:changed="${this._handleFormData}">
        ${this.renderEditor()} ${this.renderPreview()}
      </div>
    `
  }

  _handleFormData(e) {
    this.data = {...this.data, raw_data: [e.detail.data]}
    this.checkFormValidity()
  }

  _handleSaveButton() {
    this._saveNote()
    fireEvent(this, 'edit-mode:off')
  }

  async _saveNote() {
    const noteText = this.data.raw_data?.[0]
    const noteHandle = this.data.note_handles?.[0]
    if (!noteText || !noteHandle) return
    const noteData = await apiGet(`/api/notes/${noteHandle}`)
    if ('error' in noteData) {
      console.error(noteData.error)
      return
    }
    const note = {
      ...noteData.data,
      text: {_class: 'StyledText', string: noteText, tags: []},
    }
    const data = await apiPut(`/api/notes/${noteHandle}`, note)
    if ('error' in data) {
      console.error(data.error)
    }
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('edit-mode:save', this._handleSaveButton.bind(this))
  }
}

window.customElements.define('grampsjs-form-edit-match', GrampsjsFormEditMatch)
