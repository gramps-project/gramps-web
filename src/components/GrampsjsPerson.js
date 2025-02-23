import {html, css} from 'lit'

import '@material/mwc-icon'

import {GrampsjsObject} from './GrampsjsObject.js'
import {asteriskIcon, crossIcon} from '../icons.js'
import './GrampsJsImage.js'
import './GrampsjsEditGender.js'
import './GrampsjsPersonRelationship.js'

export class GrampsjsPerson extends GrampsjsObject {
  static get styles() {
    return [super.styles, css``]
  }

  static get properties() {
    return {
      homePersonDetails: {type: Object},
    }
  }

  constructor() {
    super()
    this.homePersonDetails = {}
    this._objectsName = 'People'
    this._objectEndpoint = 'people'
    this._objectIcon = 'person'
    this._showReferences = false
    this._showPersonTimeline = true
  }

  renderProfile() {
    return html`
      <h2>
        <grampsjs-edit-gender
          ?edit="${this.edit}"
          gender="${this.data.gender}"
        ></grampsjs-edit-gender>
        ${this._displayName()}
      </h2>
      ${this._renderBirth()} ${this._renderDeath()} ${this._renderRelation()}
      ${this._renderTreeBtn()}
    `
  }

  _displayName() {
    if (!this.data.profile) {
      return ''
    }
    const surname = this.data.profile.name_surname || html`&hellip;`
    const suffix = this.data.profile.name_suffix || ''
    let given = this.data.profile.name_given || html`&hellip;`
    const call = this.data?.primary_name?.call
    const callIndex = call ? given.search(call) : -1
    given =
      callIndex > -1
        ? html`
            ${given.substring(0, callIndex)}
            <span class="given-name"
              >${given.substring(callIndex, callIndex + call.length)}</span
            >
            ${given.substring(callIndex + call.length)}
          `
        : given
    return html`${given} ${surname} ${suffix}`
  }

  _renderBirth() {
    const obj = this.data?.profile?.birth
    if (obj === undefined || Object.keys(obj).length === 0) {
      return ''
    }
    return html`
      <span class="event">
        <i>${asteriskIcon}</i>
        ${obj.date || ''} ${obj.place ? this._('in') : ''} ${obj.place || ''}
      </span>
    `
  }

  _renderDeath() {
    const obj = this.data?.profile?.death
    if (obj === undefined || Object.keys(obj).length === 0) {
      return ''
    }
    return html`
    <span class="event">
    <i>${crossIcon}</i>
    ${obj.date || ''}
      ${obj.place ? this._('in') : ''}
      ${obj.place || ''}
    </event>
    `
  }

  _renderRelation() {
    if (!this.homePersonDetails.handle) {
      // no home person set
      return ''
    }
    return html`
      <dl>
        <dt>${this._('Relationship to home person')}</dt>
        <dd>
          <grampsjs-person-relationship
            person1="${this.homePersonDetails.handle}"
            person2="${this.data.handle}"
            .appState="${this.appState}"
          ></grampsjs-person-relationship>
        </dd>
      </dl>
    `
  }

  _renderTreeBtn() {
    return html` <p>
      <mwc-button
        outlined
        label="${this._('Show in tree')}"
        @click="${this._handleButtonClick}"
      >
      </mwc-button>
    </p>`
  }

  _handleButtonClick() {
    this.dispatchEvent(
      new CustomEvent('pedigree:person-selected', {
        bubbles: true,
        composed: true,
        detail: {grampsId: this.data.gramps_id},
      })
    )
    this.dispatchEvent(
      new CustomEvent('nav', {
        bubbles: true,
        composed: true,
        detail: {path: 'tree'},
      })
    )
  }
}

window.customElements.define('grampsjs-person', GrampsjsPerson)
