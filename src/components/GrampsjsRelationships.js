import {LitElement, css, html} from 'lit'
import '@material/web/button/outlined-button'
import '@material/web/iconbutton/icon-button.js'
import {mdiAccountMultiple, mdiArrowDown, mdiArrowUp} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent, renderPerson} from '../util.js'
import './GrampsjsChildren.js'
import './GrampsjsIcon.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsRelationships extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .familybtn {
          margin-left: 1.5em;
          margin-bottom: 0.25em;
          vertical-align: middle;
        }

        h4 {
          display: flex;
          align-items: center;
        }

        .number {
          color: var(--grampsjs-body-font-color-35);
          font-size: 22px;
        }

        .reorder-buttons {
          margin-left: 0.75em;
          display: flex;
          align-items: center;
        }

        md-icon-button {
          --md-icon-button-icon-size: 20px;
          width: 34px;
          height: 34px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      familyList: {type: Array},
      families: {type: Array},
      parentFamilyList: {type: Array},
      primaryParentFamily: {type: Object},
      otherParentFamilies: {type: Array},
      edit: {type: Boolean},
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
    this.edit = false
  }

  render() {
    const parentFamilies = [
      this.primaryParentFamily,
      ...this.otherParentFamilies,
    ].filter(f => Object.keys(f).length > 0)
    const totalParent = parentFamilies.length
    const totalPartner = this.families.length
    return html`
      ${parentFamilies.map((familyProfile, i) =>
        this._renderFamily(
          familyProfile,
          totalParent < 2
            ? this._('Parents')
            : html`${this._('Parents')} <span class="number">${i + 1}</span>`,
          this._('Siblings'),
          this.edit && totalParent > 1
            ? this._renderReorderButtons(
                i,
                totalParent,
                () => this._moveParentFamily(i, -1),
                () => this._moveParentFamily(i, 1)
              )
            : ''
        )
      )}
      ${this.families.map(
        (familyProfile, i) =>
          this._renderFamily(
            familyProfile,
            html`${this._('Partner')}
            ${totalPartner < 2
              ? ''
              : html`<span class="number">${i + 1}</span>`}`,
            this._('Children'),
            this.edit && totalPartner > 1
              ? this._renderReorderButtons(
                  i,
                  totalPartner,
                  () => this._movePartnerFamily(i, -1),
                  () => this._movePartnerFamily(i, 1)
                )
              : ''
          ),
        this
      )}
    `
  }

  _renderReorderButtons(index, total, onUp, onDown) {
    return html`
      <div class="reorder-buttons">
        <md-icon-button
          ?disabled="${index === 0}"
          @click="${onUp}"
          title="${this._('Move up')}"
        >
          <grampsjs-icon
            path="${mdiArrowUp}"
            color="var(--mdc-theme-secondary)"
            height="20"
            width="20"
          ></grampsjs-icon>
        </md-icon-button>
        <md-icon-button
          ?disabled="${index === total - 1}"
          @click="${onDown}"
          title="${this._('Move down')}"
        >
          <grampsjs-icon
            path="${mdiArrowDown}"
            color="var(--mdc-theme-secondary)"
            height="20"
            width="20"
          ></grampsjs-icon>
        </md-icon-button>
      </div>
    `
  }

  _movePartnerFamily(index, direction) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= this.families.length) return
    const newOrder = [...this.families]
    ;[newOrder[index], newOrder[newIndex]] = [
      newOrder[newIndex],
      newOrder[index],
    ]
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {family_list: newOrder.map(f => f.handle)},
    })
  }

  _moveParentFamily(index, direction) {
    const parentFamilies = [
      this.primaryParentFamily,
      ...this.otherParentFamilies,
    ].filter(f => Object.keys(f).length > 0)
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= parentFamilies.length) return
    const newOrder = [...parentFamilies]
    ;[newOrder[index], newOrder[newIndex]] = [
      newOrder[newIndex],
      newOrder[index],
    ]
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {parent_family_list: newOrder.map(f => f.handle)},
    })
  }

  _renderFamily(
    familyProfile,
    parentTitle,
    childrenTitle,
    reorderButtons = ''
  ) {
    if (Object.keys(familyProfile).length === 0) {
      return html``
    }
    return html`
      <h4>
        ${parentTitle}
        ${this._renderFamilyBtn(familyProfile.gramps_id)}${reorderButtons}
      </h4>
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
    return html` <md-outlined-button
      class="familybtn"
      @click="${() => this._handleButtonClick(grampsId)}"
    >
      <grampsjs-icon
        path="${mdiAccountMultiple}"
        color="var(--mdc-theme-primary)"
        slot="icon"
      ></grampsjs-icon>
      ${this._('Family')}
    </md-outlined-button>`
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
