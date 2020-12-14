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

      .number {
        color: rgba(0, 0, 0, 0.35);
        font-size: 22px;
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
    return this._renderFamily(familyProfile, html`${this._('Partner')} ${this.families.length < 2 ? '' : html`<span class="number">${i + 1}</span>`}`, this._('Children'))
  }, this)}
        `
  }

  _renderFamily(familyProfile, parentTitle, childrenTitle) {
    if (Object.keys(familyProfile).length === 0) {
      return html``
    }
    return html`
    <h3>${parentTitle} ${this._renderFamilyBtn(familyProfile.gramps_id)}</h3>
    ${familyProfile?.father?.gramps_id === this.grampsId || Object.keys(familyProfile?.father || {}).length === 0 ? '' :  html`
      <p>${renderPerson(familyProfile.father)}</p>
    `}
    ${familyProfile?.mother?.gramps_id === this.grampsId || Object.keys(familyProfile?.mother || {}).length === 0 ? '' :  html`
      <p>${renderPerson(familyProfile.mother)}</p>
    `}
    ${this._renderChildren(familyProfile, childrenTitle)}
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

  _renderChildren(obj, childrenTitle) {
    return html`

    ${obj?.children?.length ? html`
    <h3>${childrenTitle}</h3>
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
