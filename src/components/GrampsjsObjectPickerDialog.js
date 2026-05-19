import {html, css, LitElement} from 'lit'

import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import '@material/mwc-textfield'
import '@material/mwc-circular-progress'

import {sharedStyles} from '../SharedStyles.js'
import {debounce, fireEvent} from '../util.js'
import './GrampsjsSearchResultList.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsObjectPickerDialog extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-dialog {
          min-width: min(600px, 90vw);
          max-height: 80vh;
          --md-list-container-color: var(--md-sys-color-surface-container-high);
        }

        mwc-textfield.rounded {
          --mdc-shape-small: 28px;
          width: 100%;
        }
      `,
    ]
  }

  static get properties() {
    return {
      objectType: {type: String},
      multiple: {type: Boolean},
      excludeHandles: {type: Array},
      _data: {type: Array},
    }
  }

  constructor() {
    super()
    this.objectType = ''
    this.multiple = false
    this.excludeHandles = []
    this._data = []
  }

  render() {
    return html`
      <md-dialog>
        <div slot="content">
          <mwc-textfield
            outlined
            icon="search"
            id="textfield"
            class="rounded"
            @input="${debounce(() => this._handleInput(), 500)}"
            style="width:100%;"
          ></mwc-textfield>
          <grampsjs-search-result-list
            selectable
            .data="${this._data}"
            .appState="${this.appState}"
            @search-result:clicked="${this._handleSelected}"
          ></grampsjs-search-result-list>
        </div>
        <div slot="actions">
          <md-text-button @click="${this._handleCancel}">
            ${this._('Cancel')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  open(initialQuery = '') {
    const dialog = this.renderRoot.querySelector('md-dialog')
    const textField = this.renderRoot.getElementById('textfield')
    if (textField) {
      textField.value = initialQuery
    }
    this._fetchData(initialQuery)
    dialog?.show()
    dialog?.addEventListener('opened', () => textField?.focus(), {once: true})
  }

  _handleInput() {
    const textField = this.renderRoot.getElementById('textfield')
    this._fetchData(textField?.value ?? '')
  }

  async _fetchData(value = '') {
    const resultList = this.renderRoot.querySelector(
      'grampsjs-search-result-list'
    )
    if (resultList) {
      resultList.textEmpty = html`<mwc-circular-progress
        indeterminate
        density="-3"
      ></mwc-circular-progress>`
    }
    const url = this._getFetchUrl(value)
    const data = await this.appState.apiGet(url)
    if ('data' in data) {
      this._data = data.data.filter(
        obj => !this.excludeHandles.includes(obj.handle)
      )
      if (resultList) resultList.textEmpty = this._('Not found')
    } else if ('error' in data) {
      this._data = []
      if (resultList) resultList.textEmpty = this._('Error')
    }
  }

  _getFetchUrl(value) {
    if (window._oldSearchBackend) {
      return value
        ? `/api/search/?locale=${
            this.appState.i18n.lang || 'en'
          }&profile=all&query=${encodeURIComponent(
            `${value}* AND type:${this.objectType || '*'}`
          )}&profile=all&page=1&pagesize=20`
        : `/api/search/?sort=-change&locale=${
            this.appState.i18n.lang || 'en'
          }&profile=all&query=${encodeURIComponent(
            `type:${this.objectType || '*'}`
          )}&profile=all&page=1&pagesize=20`
    }
    let url = `/api/search/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&page=1&pagesize=20`
    if (value) {
      url = `${url}&query=${encodeURIComponent(`${value}*`)}`
    } else {
      url = `${url}&sort=-change&query=${encodeURIComponent('*')}`
    }
    if (this.objectType) {
      url = `${url}&type=${this.objectType}`
    }
    return url
  }

  _handleSelected(e) {
    this._close()
    fireEvent(this, 'select-object:selected', e.detail)
  }

  _handleCancel() {
    this._close()
  }

  _close() {
    this.renderRoot.querySelector('md-dialog')?.close()
  }
}

window.customElements.define(
  'grampsjs-object-picker-dialog',
  GrampsjsObjectPickerDialog
)
