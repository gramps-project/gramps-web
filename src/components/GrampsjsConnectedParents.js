import {css, html} from 'lit'

import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import {fireEvent} from '../util.js'
import {renderPersonAvatar, renderPersonDates} from './personListUtils.js'
import {personListItemStyles} from '../SharedStyles.js'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'

export class GrampsjsConnectedParents extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      ...super.styles,
      personListItemStyles,
      css`
        .parents-row {
          display: flex;
          flex-wrap: wrap;
        }

        .parent-col {
          flex: 1 1 100%;
          min-width: 0;
          max-width: 450px;
        }

        md-list,
        md-list > * {
          --md-ripple-hover-opacity: 0;
          --md-ripple-pressed-opacity: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      ...super.properties,
      familyGrampsId: {type: String},
      profile: {type: Object},
      highlightId: {type: String},
    }
  }

  constructor() {
    super()
    this.familyGrampsId = ''
    this.profile = {}
    this.highlightId = ''
  }

  getUrl() {
    if (!this.familyGrampsId) return ''
    return `/api/families/?gramps_id=${this.familyGrampsId}&extend=father_handle,mother_handle`
  }

  _renderParentsList(extFather, extMother) {
    const {father, mother} = this.profile
    const showFather =
      father &&
      Object.keys(father).length > 0 &&
      father.gramps_id !== this.highlightId
    const showMother =
      mother &&
      Object.keys(mother).length > 0 &&
      mother.gramps_id !== this.highlightId
    if (!showFather && !showMother) return html``
    return html`
      <div class="parents-row">
        ${showFather
          ? html`<md-list class="parent-col">
              ${this._renderParent(father, extFather)}
            </md-list>`
          : ''}
        ${showMother
          ? html`<md-list class="parent-col">
              ${this._renderParent(mother, extMother)}
            </md-list>`
          : ''}
      </div>
    `
  }

  _renderParent(personProfile, extPerson) {
    return html`
      <md-list-item
        type="button"
        @click="${() =>
          fireEvent(this, 'nav', {
            path: `person/${personProfile.gramps_id}`,
          })}"
      >
        ${personProfile.name_given || ''} ${personProfile.name_surname || ''}
        ${renderPersonDates(personProfile, {showAge: false})}
        ${renderPersonAvatar(extPerson, personProfile.sex)}
      </md-list-item>
    `
  }

  renderContent() {
    const extended = this._data?.data?.[0]?.extended || {}
    return this._renderParentsList(
      extended.father || null,
      extended.mother || null
    )
  }

  renderLoading() {
    return this._renderParentsList(null, null)
  }
}

window.customElements.define(
  'grampsjs-connected-parents',
  GrampsjsConnectedParents
)
