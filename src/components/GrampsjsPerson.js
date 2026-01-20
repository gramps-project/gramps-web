import {html, css} from 'lit'
import '@material/web/button/outlined-button'
import {mdiFamilyTree, mdiDna, mdiSearchWeb} from '@mdi/js'
import {GrampsjsObject} from './GrampsjsObject.js'
import {asteriskIcon, crossIcon} from '../icons.js'
import './GrampsJsImage.js'
import './GrampsjsEditGender.js'
import './GrampsjsPersonRelationship.js'
import './GrampsjsFormExternalSearch.js'
import {fireEvent} from '../util.js'

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
      <p class="button-list">
        ${this._renderTreeBtn()} ${this._renderDnaBtn()}
        ${this._renderExternalSearchBtn()}
      </p>
    `
  }

  _displayName() {
    if (!this.data.profile) {
      return ''
    }
    const surname = this.data.profile.name_surname || '…'
    const suffix = this.data.profile.name_suffix || ''
    const call = this.data?.primary_name?.call
    let given = this.data.profile.name_given || call || '…'
    const callIndex = call && call !== given ? given.search(call) : -1
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
        ${obj.date || ''} ${obj.place ? this._('in') : ''}
        ${obj.place_name || obj.place || ''}
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
        ${obj.date || ''} ${obj.place ? this._('in') : ''}
        ${obj.place_name || obj.place || ''}
      </span>
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
    return html`
      <md-outlined-button @click="${this._handleTreeButtonClick}">
        ${this._('Show in tree')}
        <grampsjs-icon
          path="${mdiFamilyTree}"
          color="var(--mdc-theme-primary)"
          slot="icon"
        >
        </grampsjs-icon>
      </md-outlined-button>
    `
  }

  _renderExternalSearchBtn() {
    return html`
      <md-outlined-button @click="${this._handleExternalSearchClick}">
        ${this._('External Search')}
        <grampsjs-icon
          path="${mdiSearchWeb}"
          color="var(--mdc-theme-primary)"
          slot="icon"
        >
        </grampsjs-icon>
      </md-outlined-button>
    `
  }

  _renderDnaBtn() {
    if (!this.data?.person_ref_list?.filter(ref => ref.rel === 'DNA').length) {
      // no DNA data
      return ''
    }
    return html`
      <md-outlined-button
        @click="${this._handleDnaButtonClick}"
        class="dna-btn"
      >
        ${this._('DNA matches')}
        <grampsjs-icon
          path="${mdiDna}"
          color="var(--mdc-theme-primary)"
          slot="icon"
        ></grampsjs-icon>
      </md-outlined-button>
    `
  }

  _handleTreeButtonClick() {
    this.dispatchEvent(
      new CustomEvent('pedigree:person-selected', {
        bubbles: true,
        composed: true,
        detail: {grampsId: this.data.gramps_id},
      })
    )
    fireEvent(this, 'nav', {path: 'tree'})
  }

  _handleExternalSearchClick() {
    // Helper to extract year from date string (format: "YYYY-MM-DD" or "YYYY")
    const extractYear = dateStr => {
      if (!dateStr) return ''
      const match = dateStr.match(/^\d{4}/)
      return match ? match[0] : ''
    }
    const data = {
      name_given: this.data?.profile?.name_given,
      name_surname: this.data?.profile?.name_surname,
      name_middle: this.data?.profile?.name_given?.split(' ')[1] || '',
      place_name:
        this.data?.profile?.birth?.place_name ||
        this.data?.profile?.birth?.place ||
        this.data?.profile?.death?.place_name ||
        this.data?.profile?.death?.place ||
        '',
      birth_year: extractYear(this.data?.profile?.birth?.date),
      death_year: extractYear(this.data?.profile?.death?.date),
    }
    this.dialogContent = html`
      <div>
        <grampsjs-form-external-search
          @object:cancel=${this._handleCancelDialog}
          .appState="${this.appState}"
          .data=${data}
          .dialogTitle=${this._('External Search')}
          .hideSaveButton=${true}
        >
        </grampsjs-form-external-search>
      </div>
    `
  }

  _handleCancelDialog() {
    this.dialogContent = ''
  }

  _handleDnaButtonClick() {
    fireEvent(this, 'nav', {path: `dna-matches/${this.data.gramps_id}`})
  }
}

window.customElements.define('grampsjs-person', GrampsjsPerson)
