import {html} from 'lit'

import '@material/mwc-textfield'

import {GrampsjsNewMediaMixin} from '../mixins/GrampsjsNewMediaMixin.js'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'

import {apiPost, apiPut} from '../api.js'

export class GrampsjsViewNewMedia extends GrampsjsNewMediaMixin(
  GrampsjsViewNewObject
) {
  constructor() {
    super()
    this.data = {_class: 'Media'}
    this.postUrl = '/api/media/'
    this.itemPath = 'media'
    this.objClass = 'Media'
  }

  renderContent() {
    return html`
      <h2>${this._('New Media')}</h2>

      ${this.renderForm()} ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  checkFormValidity() {
    const upload = this.shadowRoot.getElementById('upload')
    this.isFormValid = !!upload.file.name
  }

  _handleFormData(e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'date') {
      this.data = {...this.data, date: e.detail.data}
    }
    if (originalTarget.id === 'upload') {
      this.data = {
        ...this.data,
        desc: e.detail.data.name.replace(/\.[^/.]+$/, ''),
      }
    }
    this.checkFormValidity()
  }

  _reset() {
    super._reset()
    this.isFormValid = false
    this.data = {_class: 'Media'}
  }

  _submit() {
    const upload = this.shadowRoot.getElementById('upload')
    apiPost(this.postUrl, upload.file, false, false)
      .then(data => {
        if ('data' in data) {
          this.error = false
          this.data = {...data.data[0].new, ...this.data}
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
      .then(() => {
        const updateUrl = `/api/media/${this.data.handle}`
        apiPut(updateUrl, this.data).then(data => {
          if ('data' in data) {
            this.error = false
            this.dispatchEvent(
              new CustomEvent('nav', {
                bubbles: true,
                composed: true,
                detail: {path: this._getItemPath(this.data.gramps_id)},
              })
            )
            this._reset()
          } else if ('error' in data) {
            this.error = true
            this._errorMessage = data.error
          }
        })
      })
  }
}

window.customElements.define('grampsjs-view-new-media', GrampsjsViewNewMedia)
