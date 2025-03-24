import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {GrampsjsNewMediaMixin} from '../mixins/GrampsjsNewMediaMixin.js'

import {fireEvent, emptyDate} from '../util.js'

export class GrampsjsFormNewMedia extends GrampsjsNewMediaMixin(
  GrampsjsObjectForm
) {
  constructor() {
    super()
    this.data = {_class: 'Media'}
  }

  checkFormValidity() {
    const upload = this.shadowRoot.getElementById('upload')
    this.isFormValid = !!upload.file.name
  }

  _handleFormData(e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'date') {
      this.data = {...this.data, date: e.detail.data ?? emptyDate}
    }
    if (originalTarget.id === 'upload') {
      this.data = {
        ...this.data,
        desc: e.detail.data.name.replace(/\.[^/.]+$/, ''),
      }
    }
    this.checkFormValidity()
  }

  async upload(dbChanged = false) {
    const uploadElement = this.shadowRoot.getElementById('upload')
    let data = await this.appState.apiPost('/api/media/', uploadElement.file, {
      isJson: false,
      dbChanged: false,
    })
    if ('data' in data) {
      this.data = {...data.data[0].new, ...this.data}
    } else if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
      return {error: data.error}
    }
    const updateUrl = `/api/media/${this.data.handle}`
    data = await this.appState.apiPut(updateUrl, this.data, {dbChanged})
    if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
      return {error: data.error}
    }
    return {data: this.data}
  }
}

window.customElements.define('grampsjs-form-new-media', GrampsjsFormNewMedia)
