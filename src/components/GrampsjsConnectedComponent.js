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
    }
  }

  constructor() {
    super()
    this.loading = true
    this.error = false
    this.loadWithoutLocale = false
    this._errorMessage = ''
    this._data = {}
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
      return ''
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
    if (
      changed.has('strings') &&
      '__lang__' in this.strings &&
      changed.get('strings')?.__lang__ !== this.strings?.__lang__
    ) {
      this._updateData()
    }
  }

  _updateData(clearData = true) {
    const url = this.getUrl()
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
    this._updateData()
    window.addEventListener('db:changed', () => this._updateData())
    window.addEventListener('online', this._handleOnline.bind(this))
  }
}
