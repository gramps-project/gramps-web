import {LitElement, html} from 'lit-element'
import '@material/mwc-button'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsChildren.js'

export class GrampsjsFamilies extends LitElement {

  static get styles() {
    return [
      sharedStyles
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      familyList: {type: Array},
      families: {type: Array},
      primaryParentFamily: {type: Object},
      otherParentFamilies: {type: Array},
      strings: {type: Object}
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.familyList = []
    this.families = []
    this.otherParentFamilies = []
    this.primaryParentFamily = {}
    this.strings = {}
  }

  render() {
    return html`
    ${Object.keys(this.primaryParentFamily).length === 0 ? '' :  html`
      <h3>${this._('Siblings')}</h3>
      ${this.renderFamily(this.primaryParentFamily)}
      ${this.otherParentFamilies.map(this.renderFamily, this)}
    `}
    ${this.families === 0 ? '' :  html`
      <h3>${this._('Children')}</h3>
      ${this.families.map(this.renderFamily, this)}
    `}
    `
  }

  renderFamily(obj) {
    return html`

    ${obj?.children?.length ? html`
    <grampsjs-children
      .profile=${obj?.children || []}
      .strings=${this.strings}
      highlightId="${this.grampsId}"
      >
    </grampsjs-children>
    ` : ''}
    `
  }

  _(s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }
}

window.customElements.define('grampsjs-families', GrampsjsFamilies)
