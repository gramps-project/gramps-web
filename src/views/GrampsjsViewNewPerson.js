import {html} from 'lit'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import {GrampsjsNewPersonMixin} from '../mixins/GrampsjsNewPersonMixin.js'

export class GrampsjsViewNewPerson extends GrampsjsNewPersonMixin(
  GrampsjsViewNewObject
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
  }

  _submit() {
    const processedData = this._processedData()
    // Captured before the POST: the response fires db:changed, which refreshes
    // the object counts. An unset dbInfo fails closed and skips the home person.
    const treeWasEmpty = this.appState.dbInfo?.object_counts?.people === 0
    this.appState.apiPost(this.postUrl, processedData).then(data => {
      if ('data' in data) {
        this.error = false
        const grampsId = data.data.filter(obj => obj.new._class === 'Person')[0]
          .new.gramps_id
        // The first person in an empty tree becomes the home person, so the
        // tree charts have a starting point without the user setting one.
        if (treeWasEmpty && !this.appState.settings?.homePerson) {
          this.appState.updateSettings({homePerson: grampsId}, true)
        }
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
