import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet} from '../api.js'

export class GrampsjsViewObjectsDetail extends GrampsjsView {
  static get styles () {
    return [
      super.styles,
      css`
      :host {
      }
    `]
  }

  static get properties () {
    return {
      grampsIds: {type: Array},
      dialogContent: {type: String},
      _data: {type: Array},
      edit: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.grampsIds = []
    this.dialogContent = ''
    this._data = []
    this.edit = false
  }

  getUrl () {
    return ''
  }

  renderContent () {
    if (this._data.length === 0) {
      return html`${this.edit ? this.renderEdit() : ''}`
    }
    return html`
    ${this.renderElements()}

    ${this.edit ? this.renderEdit() : ''}

    ${this.dialogContent}
    `
  }

  renderEdit () {

  }

  renderElements () {
    return html``
  }

  update (changed) {
    super.update(changed)
    if (this.active && changed.has('grampsIds')) {
      this._updateData()
    }
  }

  _updateData () {
    if (this._url === '') {
      return
    }
    if (this.grampsIds.length === 0) {
      this._data = []
    } else {
      this._data = []
      this.loading = true
      apiGet(this.getUrl()).then(data => {
        this.loading = false
        if ('data' in data) {
          this.error = false
          this._data = data.data.sort((a, b) => this.grampsIds.indexOf(a.gramps_id) - this.grampsIds.indexOf(b.gramps_id))
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    }
  }
}
