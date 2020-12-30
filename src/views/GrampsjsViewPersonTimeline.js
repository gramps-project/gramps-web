import {html, css} from 'lit-element'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet} from '../api.js'
import '../components/GrampsjsPersonTimeline.js'


export class GrampsjsViewPersonTimeline extends GrampsjsView {

  static get styles() {
    return [
      super.styles,
      css`
      :host {
        margin: 0;
      }
      `
    ]
  }

  static get properties() {
    return {
      handle: {type: String},
      _data: {type: Array}
    }
  }


  constructor() {
    super()
    this.handle = ''
    this._data = []
  }


  renderContent() {
    if (this._data.length === 0) {
      if (this.loading) {
        return html``
      }
      return html`Failed`
    }
    return this.renderElements()
  }

  renderElements() {
    return html`
      <grampsjs-person-timeline .data="${this._data}" .strings="${this.strings}">
      </grampsjs-person-timeline>
    `
  }

  update(changed) {
    super.update(changed)
    if (this.active && changed.has('handle')) {
      this._updateData()
    }
  }

  _updateData() {
    if (this.handle) {
      const url = `/api/people/${this.handle}/timeline?locale=${this.strings.__lang__ || 'en'}`
      this._data = []
      this.loading = true
      apiGet(url).then(data => {
        this.loading = false
        if ('data' in data) {
          this._data = data.data
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    }
  }
}


window.customElements.define('grampsjs-view-person-timeline', GrampsjsViewPersonTimeline)
