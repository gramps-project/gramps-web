/* eslint-disable class-methods-use-this */
import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import {arrayEqual} from '../util.js'

export class GrampsjsViewObjectsDetail extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
        }
      `,
    ]
  }

  static get properties() {
    return {
      ids: {type: Array},
      dialogContent: {type: String},
      _data: {type: Array},
      edit: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.ids = []
    // the property of the fetched objects that `ids` refers to
    this.idKey = 'gramps_id'
    this.dialogContent = ''
    this._data = []
    this.edit = false
  }

  getUrl() {
    return ''
  }

  renderContent() {
    if (this.loading) {
      return this.renderLoading()
    }
    if (this._data.length === 0) {
      return html`${this.edit ? this.renderEdit() : ''}`
    }
    return html`
      ${this.edit ? this.renderEdit() : ''} ${this.renderElements()}
      ${this.dialogContent}
    `
  }

  renderLoading() {
    return ''
  }

  renderEdit() {}

  renderElements() {
    return html``
  }

  update(changed) {
    super.update(changed)
    if (this.active && changed.has('ids')) {
      // ids is an array, so we need to check if its *contents* have changed as well
      if (
        changed.get('ids') === undefined ||
        !arrayEqual(this.ids, changed.get('ids'))
      ) {
        this._updateData()
      } else {
        // same contents in a different order: reorder the existing data
        this._sortData()
      }
    }
  }

  _sortData() {
    this._data = [...this._data].sort(
      (a, b) =>
        this.ids.indexOf(a[this.idKey]) - this.ids.indexOf(b[this.idKey])
    )
  }

  _updateData() {
    if (this._url === '') {
      return
    }
    if (this.ids.length === 0) {
      this._data = []
    } else {
      this._data = []
      this.loading = true
      this.appState.apiGet(this.getUrl()).then(data => {
        this.loading = false
        if ('data' in data) {
          this.error = false
          this._data = data.data
          this._sortData()
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    }
  }
}
