/*
Form for adding a new event reference
*/

import {html} from 'lit'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import './GrampsjsSearchResultList.js'
import './GrampsjsFormString.js'
import {apiGet, apiPost} from '../api.js'
import {makeHandle} from '../util.js'

class GrampsjsFormNewTag extends GrampsjsObjectForm {
  static get properties() {
    return {
      searchRes: {type: Array},
      disableString: {type: Boolean},
      disableField: {type: Boolean},
      _selectedTag: {type: String},
      _tagName: {type: String},
      _tagColor: {type: String},
    }
  }

  constructor() {
    super()
    this.searchRes = []
    this.disableString = false
    this._selectedTag = ''
    this._tagName = ''
    this._tagColor = ''
  }

  renderForm() {
    return html`
      <grampsjs-form-string
        @formdata:changed="${this._handleString}"
        ?disabled="${this.disableString}"
        fullwidth
        id="create"
        label="${this._('New Tag')}"
      >
      </grampsjs-form-string>
      <input
        type="color"
        id="color"
        @change="${this._handleColor}"
        list="presetColors"
      />
      <datalist id="presetColors">
        <option>#1f77b4</option>
        <option>#ff7f0e</option>
        <option>#2ca02c</option>
        <option>#d62728</option>
        <option>#9467bd</option>
        <option>#8c564b</option>
        <option>#e377c2</option>
        <option>#7f7f7f</option>
        <option>#bcbd22</option>
        <option>#17becf</option>
      </datalist>
      <grampsjs-search-result-list
        selectable
        activatable
        .data="${this.searchRes}"
        .strings="${this.strings}"
        @search-result:clicked="${this._handleSelected}"
      ></grampsjs-search-result-list>
    `
  }

  firstUpdated() {
    this._fetchData()
  }

  async _fetchData() {
    const url = `/api/tags/?locale=${
      this.strings?.__lang__ || 'en'
    }&profile=all&pagesize=100`
    const data = await apiGet(url)
    if ('data' in data) {
      this.searchRes =
        data.data
          ?.map(tag => ({
            object_type: 'tag',
            object: tag,
            handle: tag.handle,
          }))
          ?.filter(obj => !this.data.includes(obj.handle)) ?? []
    } else if ('error' in data) {
      this.searchRes = []
    }
  }

  _handleString(e) {
    this._tagName = e.detail.data
  }

  _handleColor() {
    const el = this.shadowRoot.getElementById('color')
    this._tagColor = el.value
  }

  async _handleDialogSave() {
    if (!this.disableString && this._tagName) {
      const handle = await this._createNewTag()
      this.data = [...this.data, handle]
    } else if (this._selectedTag && !this.data.includes(this._selectedTag)) {
      this.data = [...this.data, this._selectedTag]
    }
    super._handleDialogSave()
  }

  async _createNewTag() {
    const obj = {
      _class: 'Tag',
      handle: makeHandle(),
      name: this._tagName,
    }
    if (this._tagColor) {
      obj.color = this._tagColor
    }
    await apiPost('/api/tags/', obj)
    return obj.handle
  }

  _handleSelected(e) {
    this.disableString = true
    const obj = e.detail
    this._selectedTag = obj.handle
  }
}

window.customElements.define('grampsjs-form-new-tag', GrampsjsFormNewTag)
