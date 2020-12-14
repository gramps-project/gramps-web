import {html, css} from 'lit-element'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet} from '../api.js'


export class GrampsjsViewObjectsDetail extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
      :host {
      }
    `]
  }


  static get properties() {
    return {
      grampsIds: {type: Array},
      _data: {type: Array},
    }
  }


  constructor() {
    super()
    this.grampsIds = []
    this._data = []
  }

  getUrl() {
    return ''
  }


  renderContent() {
    if (this._data.length === 0) {
      if (this.loading) {
        return html``
      }
      return html``
    }
    return this.renderElements()
  }

  renderElements() {
    return html``
  }

  update(changed) {
    super.update(changed)
    if (this.active && changed.has('grampsIds')) {
      this._updateData()
    }
  }

  _updateData() {
    if (this._url === '') {
      return
    }
    if (this.grampsIds.length !== 0) {
      this._data = []
      this.loading = true
      apiGet(this.getUrl()).then(data => {
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
