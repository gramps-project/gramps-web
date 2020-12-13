import {LitElement, css, html} from 'lit-element'
import '@material/mwc-button'
import '@material/mwc-icon'

import {sharedStyles} from '../SharedStyles.js'
import {renderPerson} from '../util.js'
import './GrampsjsChildren.js'

export class GrampsjsRelationships extends LitElement {

  static get styles() {
    return [
      sharedStyles,
      css`
      .familybtn {
        margin-left: 1.5em;
      }
      `
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
    ${this._renderFamily(this.primaryParentFamily, this._('Parents'), this._('Siblings'))}
    ${this.otherParentFamilies.map((familyProfile, i) => {
    return this._renderFamily(familyProfile, `${this._('Parents')} #${i + 2}`, this._('Siblings'))
  }, this)}
    ${this.families.map((familyProfile, i) => {
    return this._renderFamily(familyProfile, `${this._('Partner')} ${this.families.length < 2 ? '' : `#${i + 1}`}`, this._('Children'))
  }, this)}
        `
  }

  _renderFamily(familyProfile, parentTitle, childrenTitle) {
    if (Object.keys(familyProfile).length === 0) {
      return html``
    }
    return html`
    <h3>${parentTitle} ${this._renderFamilyBtn(familyProfile.gramps_id)}</h3>
    ${familyProfile?.father?.gramps_id !== this.grampsId && Object.keys(familyProfile?.father || {}).length === 0 ? '' :  html`
      <p>${renderPerson(familyProfile.father)}</p>
    `}
    ${Object.keys(familyProfile?.mother?.gramps_id !== this.grampsId && familyProfile?.mother || {}).length === 0 ? '' :  html`
      <p>${renderPerson(familyProfile.mother)}</p>
    `}
    <h3>${childrenTitle}</h3>
    ${this._renderChildren(familyProfile)}
  `
  }

  _renderFamilyBtn(grampsId) {
    return html`
    <mwc-button
      class="familybtn"
      outlined
      label="${this._('Family')}"
      @click="${() => this._handleButtonClick(grampsId)}">
    </mwc-button>`
  }

  _handleButtonClick(grampsId) {
    this.dispatchEvent(new CustomEvent('nav', {
      bubbles: true, composed: true, detail: {
        path: `family/${grampsId}`
      }
    }))
  }

  _renderChildren(obj) {
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

window.customElements.define('grampsjs-relationships', GrampsjsRelationships)
