import {LitElement, css, html} from 'lit'
import '@material/mwc-button'
import '@material/mwc-icon'

import {sharedStyles} from '../SharedStyles.js'
import {renderPerson} from '../util.js'
import './GrampsjsChildren.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsRelationships extends GrampsjsAppStateMixin(LitElement) {
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
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      familyList: {type: Array},
      families: {type: Array},
      parentFamilies: {type: Array},
      primaryParentFamily: {type: Object},
      otherParentFamilies: {type: Array},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.familyList = []
    this.parentFamilyList = []
    this.families = []
    this.otherParentFamilies = []
    this.primaryParentFamily = {}
  }

  render() {
    return html`
      ${this._renderFamily(
        this.primaryParentFamily,
        this._('Parents'),
        this._('Siblings')
      )}
      ${this.otherParentFamilies.map(
        (familyProfile, i) =>
          this._renderFamily(
            familyProfile,
            `${this._('Parents')} #${i + 2}`,
            this._('Siblings')
          ),
        this
      )}
      ${this.families.map(
        (familyProfile, i) =>
          this._renderFamily(
            familyProfile,
            html`${this._('Partner')}
            ${this.families.length < 2
              ? ''
              : html`<span class="number">${i + 1}</span>`}`,
            this._('Children')
          ),
        this
      )}
    `
  }

  _renderFamily(familyProfile, parentTitle, childrenTitle) {
    if (Object.keys(familyProfile).length === 0) {
      return html``
    }
    return html`
      <h4>${parentTitle} ${this._renderFamilyBtn(familyProfile.gramps_id)}</h4>
      ${familyProfile?.father?.gramps_id === this.grampsId ||
      Object.keys(familyProfile?.father || {}).length === 0
        ? ''
        : html` <p>${renderPerson(familyProfile.father)}</p> `}
      ${familyProfile?.mother?.gramps_id === this.grampsId ||
      Object.keys(familyProfile?.mother || {}).length === 0
        ? ''
        : html` <p>${renderPerson(familyProfile.mother)}</p> `}
      ${this._renderChildren(familyProfile, childrenTitle)}
    `
  }

  _renderFamilyBtn(grampsId) {
    return html` <mwc-button
      class="familybtn"
      outlined
      label="${this._('Family')}"
      @click="${() => this._handleButtonClick(grampsId)}"
    >
    </mwc-button>`
  }

  _handleButtonClick(grampsId) {
    this.dispatchEvent(
      new CustomEvent('nav', {
        bubbles: true,
        composed: true,
        detail: {
          path: `family/${grampsId}`,
        },
      })
    )
  }

  _renderChildren(profile, childrenTitle) {
    const allFamilies = [...this.familyList, ...this.parentFamilyList]
    const [family] = allFamilies.filter(obj => obj.handle === profile.handle)
    return html`
      ${profile?.children?.length
        ? html`
            <h4>${childrenTitle}</h4>
            <grampsjs-children
              .profile=${profile?.children || []}
              .data=${family.child_ref_list}
              .appState="${this.appState}"
              highlightId="${this.grampsId}"
            >
            </grampsjs-children>
          `
        : ''}
    `
  }
}

window.customElements.define('grampsjs-relationships', GrampsjsRelationships)
