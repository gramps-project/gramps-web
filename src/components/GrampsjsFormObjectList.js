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

import {fireEvent} from '../util.js'
import './GrampsjsSearchResultList.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'


class GrampsjsFormObjectList extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
      mwc-icon-button {
        vertical-align: middle;
        color: rgba(0, 0, 0, 0.4);
        --mdc-theme-text-disabled-on-light: rgba(0, 0, 0, 0.15);
      }
      `
    ]
  }

  static get properties() {
    return {
      objects: {type: Array},
      selectedIndex: {type: Number},
      reorder: {type: Boolean},
      deletable: {type: Boolean}
    }
  }


  constructor() {
    super()
    this.objectType = false
    this.objects = []
    this.selectedIndex = -1
    this.reorder = false
    this.deletable = false
  }

  render() {
    const empty = this.objects.length === 0
    const one = this.objects.length === 1
    const unselected = this.selectedIndex < 0
    if (empty) {
      return html``
    }
    return html`
      <div class="buttons">
      ${this.deletable ? html`
        <mwc-icon-button
          icon="delete"
          ?disabled="${unselected}"
          @click="${this._handleDelete}"
        ></mwc-icon-button>
        ` : ''}
        ${this.reorder ? html`<mwc-icon-button
          icon="arrow_upward"
          ?disabled="${unselected || one || this.selectedIndex === 0}"
          @click="${this._handleUp}"
        ></mwc-icon-button>
        <mwc-icon-button
          icon="arrow_downward"
          ?disabled="${unselected || one || this.selectedIndex === this.objects.length - 1}"
          @click="${this._handleDown}"
        ></mwc-icon-button>` : ''}
      </div>
      <grampsjs-search-result-list
        ?activatable="${this.deletable || this.reorder}"
        ?selectable="${this.deletable || this.reorder}"
        @action="${this._handleSelected}"
        .data="${this.objects}"
        .strings="${this.strings}"
      ></grampsjs-search-result-list>
      `
  }

  _handleSelected(e) {
    this.selectedIndex = e.detail.index
  }

  _handleDelete() {
    this.objects = [...this.objects].filter((obj, i) => i !== this.selectedIndex)
    if (this.selectedIndex + 1 > this.objects.length) {
      this.selectedIndex = -1
    }
    this._handleChange()
  }

  _handleUp() {
    const i = this.selectedIndex
    if (i === 1) {
      this.objects = [
        this.objects[1],
        this.objects[0],
        ...this.objects.slice(2)
      ]
    }
    else if (i > 1) {
      this.objects = [
        ...this.objects.slice(0, i - 1),
        this.objects[i],
        this.objects[i - 1],
        ...this.objects.slice(i + 1)
      ]
    }
    this._handleChange()
  }

  _handleDown() {
    const L = this.objects.length
    const i = this.selectedIndex
    if (i === 0) {
      this.objects = [
        this.objects[1],
        this.objects[0],
        ...this.objects.slice(2)
      ]
    }
    else if (i < L - 1) {
      this.objects = [
        ...this.objects.slice(0, i),
        this.objects[i + 1],
        this.objects[i],
        ...this.objects.slice(i + 2)
      ]
    }

  }

  _handleChange() {
    fireEvent(this, 'object-list:changed', {objects: this.objects})
  }

  reset() {
    this.objects = []
  }

  _handleList() {
    return this.objects.map(_obj => _obj.handle)
  }

  update(changed) {
    super.update(changed)
    if (changed.has('objects')) {
      fireEvent(this, 'formdata:changed', {data: this._handleList()})
    }
  }
}

window.customElements.define('grampsjs-form-object-list', GrampsjsFormObjectList)
