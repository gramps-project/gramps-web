import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {GrampsjsNewNoteMixin} from '../mixins/GrampsjsNewNoteMixin.js'

export class GrampsjsFormNewNote extends GrampsjsNewNoteMixin(
  GrampsjsObjectForm
) {
  constructor() {
    super()
    this.data = {_class: 'Note', text: {_class: 'StyledText', string: ''}}
  }

  checkFormValidity() {
    const noteText = this.shadowRoot.querySelector('grampsjs-editor')
    this.isFormValid = noteText.data.string.trim() !== ''
  }

  handleEditor(e) {
    this.checkFormValidity()
    this.data = {...this.data, text: e.detail.data}
  }

  _handleFormData(e) {
    this.checkFormValidity()
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'select-note-type') {
      this.data = {
        ...this.data,
        type: {_class: 'NoteType', string: e.detail.data},
      }
    }
    if (originalTarget.id === 'private') {
      this.data = {...this.data, private: e.detail.checked}
    }
  }
}

window.customElements.define('grampsjs-form-new-note', GrampsjsFormNewNote)
