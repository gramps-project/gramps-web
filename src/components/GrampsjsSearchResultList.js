import {LitElement, css, html} from 'lit'
import '@material/mwc-icon'
import '@material/mwc-icon-button'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'

import {objectDescription, objectIcon, translate, fireEvent} from '../util.js'


export class GrampsjsSearchResultList extends LitElement {

  static get styles() {
    return [
      css`
      mwc-list {
        --mdc-list-item-graphic-margin: 16px;
      }
      `
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      strings: {type: Object},
      textEmpty: {type: String},
      activatable: {type: Boolean}
    }
  }

  constructor() {
    super()
    this.data = []
    this.strings = {}
    this.textEmpty = ''
    this.activatable = false
  }

  render() {
    return html`
    <mwc-list
      id="search-results"
      ?activatable="${this.activatable}"
    >
    ${this.data.length === 0 && this.textEmpty ? html`
        <mwc-list-item noninteractive>
          <span>${this.textEmpty}</span>
        </mwc-list-item>
    `: ''}
    ${this.data.map((obj, i, arr) =>  html`
        <mwc-list-item
          twoline
          graphic="icon"
          @click="${() => this._handleClick(obj)}"
        >
          <mwc-icon slot="graphic">${objectIcon[obj.object_type]}</mwc-icon>
          <span>${objectDescription(obj.object_type, obj.object, this.strings)}</span>
          <span slot="secondary">Secondary line</span>
        </mwc-list-item>
        ${arr.length - 1 !== i ? html`<li divider inset padded role="separator"></li>` : ''}
        `, this)}
    </mwc-list>
    `
  }

  _handleClick(obj) {
    fireEvent(this, 'search-result:clicked', obj)
  }

  _(s) {
    return translate(this.strings, s)
  }
}


window.customElements.define('grampsjs-search-result-list', GrampsjsSearchResultList)
