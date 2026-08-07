/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'

import '@material/mwc-list/mwc-list-item'
import '@material/mwc-list'
import '@material/mwc-menu'
import '@material/mwc-textfield'
import '@material/web/iconbutton/icon-button.js'

import {mdiArrowDown, mdiArrowUp, mdiDelete} from '@mdi/js'

import {fireEvent} from '../util.js'
import './GrampsjsIcon.js'
import './GrampsjsSearchResultList.js'
import {sharedStyles, iconButtonColorStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsFormObjectList extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      iconButtonColorStyles,
      css`
        md-icon-button {
          vertical-align: middle;
          --grampsjs-icon-button-color: var(--grampsjs-body-font-color-40);
          --grampsjs-icon-button-disabled-color: var(
            --grampsjs-body-font-color-15
          );
          --grampsjs-icon-button-disabled-opacity: 1;
        }
      `,
    ]
  }

  static get properties() {
    return {
      objects: {type: Array},
      selectedIndex: {type: Number},
      reorder: {type: Boolean},
      deletable: {type: Boolean},
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
        ${this.deletable
          ? html`
              <md-icon-button
                aria-label="${this._('Delete')}"
                ?disabled="${unselected}"
                @click="${this._handleDelete}"
              >
                <grampsjs-icon
                  path="${mdiDelete}"
                  color="currentColor"
                ></grampsjs-icon>
              </md-icon-button>
            `
          : ''}
        ${this.reorder
          ? html`<md-icon-button
                aria-label="${this._('Move Up')}"
                ?disabled="${unselected || one || this.selectedIndex === 0}"
                @click="${this._handleUp}"
              >
                <grampsjs-icon
                  path="${mdiArrowUp}"
                  color="currentColor"
                ></grampsjs-icon>
              </md-icon-button>
              <md-icon-button
                aria-label="${this._('Move Down')}"
                ?disabled="${unselected ||
                one ||
                this.selectedIndex === this.objects.length - 1}"
                @click="${this._handleDown}"
              >
                <grampsjs-icon
                  path="${mdiArrowDown}"
                  color="currentColor"
                ></grampsjs-icon>
              </md-icon-button>`
          : ''}
      </div>
      <grampsjs-search-result-list
        ?activatable="${this.deletable || this.reorder}"
        ?selectable="${this.deletable || this.reorder}"
        @action="${this._handleSelected}"
        .data="${this.objects}"
        .appState="${this.appState}"
      ></grampsjs-search-result-list>
    `
  }

  _handleSelected(e) {
    this.selectedIndex = e.detail.index
  }

  _handleDelete() {
    this.objects = [...this.objects].filter(
      (obj, i) => i !== this.selectedIndex
    )
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
        ...this.objects.slice(2),
      ]
    } else if (i > 1) {
      this.objects = [
        ...this.objects.slice(0, i - 1),
        this.objects[i],
        this.objects[i - 1],
        ...this.objects.slice(i + 1),
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
        ...this.objects.slice(2),
      ]
    } else if (i < L - 1) {
      this.objects = [
        ...this.objects.slice(0, i),
        this.objects[i + 1],
        this.objects[i],
        ...this.objects.slice(i + 2),
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

window.customElements.define(
  'grampsjs-form-object-list',
  GrampsjsFormObjectList
)
