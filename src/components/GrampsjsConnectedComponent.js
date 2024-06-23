/* eslint-disable class-methods-use-this */
/*
Base class for Components that fetch data when first loaded
*/

import {LitElement} from 'lit'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import {apiGet} from '../api.js'

export class GrampsjsConnectedComponent extends GrampsjsTranslateMixin(
  LitElement
) {
  static get styles() {
    return [sharedStyles]
  }

  static get properties() {
    return {
      loading: {type: Boolean},
      error: {type: Boolean},
      loadWithoutLocale: {type: Boolean},
      _errorMessage: {type: String},
      _data: {type: Object},
      _oldUrl: {type: String},
    }
  }

  constructor() {
    super()
    this.loading = true
    this.error = false
    this.renderOnError = false
    this.loadWithoutLocale = false
    this._errorMessage = ''
    this._data = {}
    this._oldUrl = ''
    this._boundUpdateData = this._updateData.bind(this)
    this._boundsHandleOnline = this._handleOnline.bind(this)
  }

  render() {
    if (this.error) {
      this.dispatchEvent(
        new CustomEvent('grampsjs:error', {
          bubbles: true,
          composed: true,
          detail: {message: this._errorMessage},
        })
      )
      if (!this.renderOnError) {
        return ''
      }
    }
    if (this.loading) {
      return this.renderLoading()
    }
    return this.renderContent()
  }

  renderLoading() {
    return ''
  }

  getUrl() {
    return ''
  }

  update(changed) {
    super.update(changed)
    if (this.getUrl() !== this._oldUrl) {
      this._updateData()
    }
  }

  _updateData(clearData = true) {
    const url = this.getUrl()
    this._oldUrl = url
    if (url === '') {
      return
    }
    if (clearData) {
      this._clearData()
    }
    this.loading = true
    apiGet(url).then(data => {
      this.loading = false
      if ('data' in data) {
        this._data = {data: data.data}
        this.error = false
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }

  _clearData() {
    this._data = {}
  }

  _handleOnline() {
    if (this.error) {
      this._updateData()
    }
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('db:changed', this._boundUpdateData)
    window.addEventListener('online', this._boundHandleOnline)
  }

  disconnectedCallback() {
    window.removeEventListener('online', this._boundHandleOnline)
    window.removeEventListener('db:changed', this._boundUpdateData)
    super.disconnectedCallback()
  }
}
