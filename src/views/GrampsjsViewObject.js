import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet} from '../api.js'


export class GrampsjsViewObject extends GrampsjsView {
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
      grampsId: {type: String},
      _data: {type: Object},
      _className: {type: String}
    }
  }


  constructor() {
    super()
    this._data = {}
    this._className = ''
  }

  getUrl() {
    return ''
  }


  renderContent() {
    if (Object.keys(this._data).length === 0) {
      if (this.loading) {
        return html``
      }
      return html``
    }
    return this.renderElement()
  }

  renderElement() {
    return html``
  }

  update(changed) {
    super.update(changed)
    if (this.active && changed.has('grampsId')) {
      this._updateData()
    }
  }

  _updateData() {
    if (this._url === '') {
      return
    }
    if (this.grampsId !== undefined && this.grampsId) {
      this._data = {}
      this.loading = true
      apiGet(this.getUrl()).then(data => {
        this.loading = false
        if ('data' in data) {
          [this._data] = data.data
          this.error = false
          if (this._className !== '') {
            this.dispatchEvent(new CustomEvent('object:loaded', {bubbles: true, composed: true, detail: {grampsId: this.grampsId, className: this._className}}))
          }
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    }
  }
}
