/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'

import '@material/mwc-list/mwc-list-item'
import '@material/mwc-list'
import '@material/mwc-menu'
import '@material/mwc-icon'
import '@material/mwc-textfield'
import '@material/mwc-icon-button'
import '@material/mwc-circular-progress'

import {sharedStyles} from '../SharedStyles.js'
import {apiGet} from '../api.js'
import {debounce, fireEvent} from '../util.js'
import './GrampsjsSearchResultList.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

// labels for button
const btnLabel = {
  place: 'Select an existing place',
  source: 'Select an existing source',
  media: 'Select an existing media object',
  event: 'Share an existing event',
  note: 'Select an existing note'
}

class GrampsjsFormSelectObject extends GrampsjsTranslateMixin(LitElement) {
  static get styles () {
    return [
      sharedStyles,
      css`
      mwc-menu {
        --mdc-menu-min-width: 200px;
      }

      .container {
        padding: 8px 16px;
      }

      mwc-textfield.rounded {
        --mdc-shape-small: 28px;
      }
      `
    ]
  }

  static get properties () {
    return {
      objectType: {type: String},
      objects: {type: Array},
      data: {type: Array},
      multiple: {type: Boolean},
      fixedMenuPosition: {type: Boolean},
      label: {type: String},
      disabled: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.objectType = ''
    this.objects = []
    this.data = []
    this.multiple = false
    this.fixedMenuPosition = false
    this.label = ''
    this.disabled = false
  }

  render () {
    return html`
    <div style="position:relative;">
      <mwc-button
        raised
        ?disabled="${this.disabled}"
        label="${this.label || this._(btnLabel[this.objectType])}"
        id="button"
        @click="${this._handleBtnClick}"
        icon="add_link"
      ></mwc-button>

      <mwc-menu
        ?fixed="${this.fixedMenuPosition}"
        id="menu-search-results"
        corner="BOTTOM_LEFT"
        menuCorner="START" x="0" y="0"
        defaultFocus="NONE"
        >
        <div class="container">
          <mwc-textfield
            outlined
            icon="search"
            id="textfield"
            class="rounded"
            @input="${debounce(() => this._handleInput(), 500)}"
            style="width:100%;"
            ></mwc-textfield>
          </div>
        <grampsjs-search-result-list
          selectable
          .data="${this.data}"
          .strings="${this.strings}"
          @search-result:clicked="${this._handleSelected}"
       ></grampsjs-search-result-list>
      </mwc-menu>
    </div>
`
  }

  reset () {
    this.objects = []
    this._clearBox()
    this.data = []
  }

  _handleInput () {
    this._fetchData()
  }

  _handleList () {
    return this.objects.map(_obj => _obj.handle)
  }

  _handleSelected (e) {
    const obj = e.detail
    const handles = this._handleList()
    if (!this.multiple) {
      this.objects = [obj]
      this._closeMenu()
      fireEvent(this, 'select-object:changed', {objects: this.objects})
    } else if (!handles.includes(obj.handle)) {
      this.objects = [...this.objects, obj]
      this._closeMenu()
      fireEvent(this, 'select-object:changed', {objects: this.objects})
    }
  }

  async _handleBtnClick () {
    this._fetchData()
    this.shadowRoot.getElementById('menu-search-results').open = true
    const textField = this.shadowRoot.getElementById('textfield')
    textField.value = ''
    textField.disabled = false
    await textField.updateComplete
    textField.focus()
  }

  async _fetchData () {
    const textField = this.shadowRoot.getElementById('textfield')
    const resultList = this.shadowRoot.querySelector('grampsjs-search-result-list')
    resultList.textEmpty = html`<mwc-circular-progress indeterminate density="-3"></mwc-circular-progress>`
    const url = (
      textField.value
        ? `/api/search/?locale=${this.strings?.__lang__ || 'en'}&profile=all&query=${encodeURIComponent(`${textField.value}* AND type:${this.objectType}`)}&profile=all&page=1&pagesize=20`
        : `/api/search/?sort=-change&locale=${this.strings?.__lang__ || 'en'}&profile=all&query=${encodeURIComponent(`type:${this.objectType}`)}&profile=all&page=1&pagesize=20`
    )
    const data = await apiGet(url)
    if ('data' in data) {
      this.data = data.data.filter(obj => !this._handleList().includes(obj.handle))
      this.shadowRoot.getElementById('menu-search-results').open = true
      resultList.textEmpty = this._('Not found')
    } else if ('error' in data) {
      this.data = []
      resultList.textEmpty = this._('Error')
    }
  }

  firstUpdated () {
    const btn = this.shadowRoot.getElementById('button')
    const menu = this.shadowRoot.getElementById('menu-search-results')
    menu.anchor = btn
  }

  _closeMenu () {
    this.shadowRoot.getElementById('menu-search-results').open = false
  }

  _clearBox () {
    this.shadowRoot.getElementById('textfield').value = ''
  }
}

window.customElements.define('grampsjs-form-select-object', GrampsjsFormSelectObject)
