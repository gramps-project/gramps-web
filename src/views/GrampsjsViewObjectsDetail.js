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
      handles: {type: Array},
      dialogContent: {type: String},
      _data: {type: Array},
      edit: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.handles = []
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
    if (this.active && changed.has('handles')) {
      // handles is an array, so we need to check if its *contents* have changed as well
      if (
        changed.get('handles') === undefined ||
        !arrayEqual(this.handles, changed.get('handles'))
      ) {
        this._updateData()
      } else {
        // no new handles: arrange the objects already fetched
        this._arrangeData(this._data)
      }
    }
  }

  // one entry per handle, in the order of `handles`, keeping repeated handles;
  // a handle the response lacks gets a placeholder, so that row indices
  // always match the object's list
  _arrangeData(objects) {
    const byHandle = new Map(objects.map(obj => [obj.handle, obj]))
    this._data = this.handles.map(handle => byHandle.get(handle) ?? {handle})
  }

  _updateData() {
    if (this._url === '') {
      return
    }
    if (this.handles.length === 0) {
      this._data = []
    } else {
      this._data = []
      this.loading = true
      this.appState.apiGet(this.getUrl()).then(data => {
        this.loading = false
        if ('data' in data) {
          this.error = false
          this._arrangeData(data.data)
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    }
  }
}
