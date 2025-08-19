/* eslint-disable class-methods-use-this */
/*
Base class for Components that fetch data when first loaded
*/

import {LitElement} from 'lit'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'

import {fireEvent} from '../util.js'

export class GrampsjsConnectedComponent extends GrampsjsStaleDataMixin(
  GrampsjsAppStateMixin(LitElement)
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
      method: {type: String},
      postData: {type: Object},
      _oldPostData: {type: Object},
      active: {type: Boolean},
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
    this._boundsHandleOnline = this._handleOnline.bind(this)
    this.method = 'GET'
    this.postData = {}
    this._oldPostData = {}
    this.active = true
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
    if (this.method !== 'POST' && this.getUrl() !== this._oldUrl) {
      this._updateData()
    }
    if (this.method === 'POST' && this.postData !== this._oldPostData) {
      this._updateData()
    }
  }

  async _updateData(clearData = true) {
    const url = this.getUrl()
    this._oldUrl = url
    this._oldPostData = this.postData
    if (url === '') {
      return
    }
    if (clearData) {
      this._clearData()
    }
    this.loading = true
    if (this.method === 'POST') {
      if (Object.keys(this.postData).length > 0) {
        await this._updatePostData(url)
      }
    } else {
      await this._updateGetData(url)
    }
    this.loading = false
  }

  async _updateGetData(url) {
    const data = await this.appState.apiGet(url)
    if ('data' in data) {
      this._data = {data: data.data}
      this.error = false
      this._fireUpdateEvent()
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  async _updatePostData(url) {
    const data = await this.appState.apiPost(url, this.postData, {
      dbChanged: false,
    })
    if ('data' in data) {
      this._data = {data: data.data}
      this.error = false
      this._fireUpdateEvent()
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  _fireUpdateEvent() {
    fireEvent(this, 'connected-component:updated', {data: this._data})
  }

  _clearData() {
    this._data = {}
  }

  _handleOnline() {
    if (this.error) {
      this._updateData()
    }
  }

  handleUpdateStaleData() {
    // reload with 0.1 second delay so the views are prioritized
    setTimeout(() => this._updateData(), 100)
  }

  firstUpdated() {
    // the active property, used for lazy loading of stale data, is set
    // based on visibility of the element in the viewport
    const observer = IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.active = true
        } else {
          this.active = false
        }
      })
    })
    observer.observe(this)
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('online', this._boundHandleOnline)
  }

  disconnectedCallback() {
    window.removeEventListener('online', this._boundHandleOnline)
    super.disconnectedCallback()
  }
}
