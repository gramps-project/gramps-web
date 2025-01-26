import {html} from 'lit'

import '../components/GrampsjsFormName.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import {GrampsjsNewPersonMixin} from '../mixins/GrampsjsNewPersonMixin.js'

import {apiPost} from '../api.js'

export class GrampsjsViewNewPerson extends GrampsjsNewPersonMixin(
  GrampsjsViewNewObject,
  {allowCreate: true, allowLink: false}
) {
  constructor() {
    super()
    this.postUrl = '/api/objects/'
    this.itemPath = 'person'
    this.objClass = 'Person'
  }

  renderContent() {
    return html`
      <h2>${this._('New Person')}</h2>
      ${this.renderForm()} ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  _submit() {
    const processedData = this._processedData()
    apiPost(this.postUrl, processedData).then(data => {
      if ('data' in data) {
        this.error = false
        const grampsId = data.data.filter(obj => obj.new._class === 'Person')[0]
          .new.gramps_id
        this.dispatchEvent(
          new CustomEvent('nav', {
            bubbles: true,
            composed: true,
            detail: {path: this._getItemPath(grampsId)},
          })
        )
        this._reset()
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }
}

window.customElements.define('grampsjs-view-new-person', GrampsjsViewNewPerson)
