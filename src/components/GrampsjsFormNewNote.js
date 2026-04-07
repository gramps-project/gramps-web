import {css} from 'lit'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {GrampsjsNewNoteMixin} from '../mixins/GrampsjsNewNoteMixin.js'
import {GrampsjsNewObjectTagsMixin} from '../mixins/GrampsjsNewObjectTagsMixin.js'

export class GrampsjsFormNewNote extends GrampsjsNewObjectTagsMixin(
  GrampsjsNewNoteMixin(GrampsjsObjectForm)
) {
  static get styles() {
    return [
      super.styles,
      css`
        md-dialog {
          --md-dialog-container-max-inline-size: min(1200px, 95vw);
          --md-dialog-container-min-inline-size: min(1200px, 95vw);
          max-block-size: 95vh;
        }
      `,
    ]
  }

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
        type: e.detail.data,
      }
    }
    if (originalTarget.id === 'private') {
      this.data = {...this.data, private: e.detail.checked}
    }
  }
}

window.customElements.define('grampsjs-form-new-note', GrampsjsFormNewNote)
