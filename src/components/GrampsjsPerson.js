import {html, css} from 'lit'
import '@material/web/button/outlined-button'
import '@material/web/chips/chip-set'
import '@material/web/chips/filter-chip'
import {mdiFamilyTree, mdiDna, mdiSearchWeb} from '@mdi/js'
import {GrampsjsObject} from './GrampsjsObject.js'
import {asteriskIcon, crossIcon} from '../icons.js'
import './GrampsjsImg.js'
import './GrampsjsEditGender.js'
import './GrampsjsPersonRelationship.js'
import './GrampsjsFormExternalSearch.js'
import {fireEvent} from '../util.js'

export class GrampsjsPerson extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        .events-chips {
          margin-bottom: 16px;
        }

        .events-chips md-filter-chip {
          --md-sys-color-secondary-container: var(
            --md-sys-color-surface-variant
          );
          --md-sys-color-on-secondary-container: var(
            --md-sys-color-on-surface-variant
          );
        }
      `,
    ]
  }

  static get properties() {
    return {
      homePersonDetails: {type: Object},
      timelineData: {type: Array},
      _showFamilyEvents: {type: Boolean},
      _showRelatedEvents: {type: Boolean},
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
    this.timelineData = []
    this._showFamilyEvents = false
    this._showRelatedEvents = false
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

  _handleFamilyEventsToggle(e) {
    this._showFamilyEvents = e.target.selected
    if (this._showFamilyEvents || this._showRelatedEvents) {
      fireEvent(this, 'person:timeline-needed')
    }
  }

  _handleRelatedEventsToggle(e) {
    this._showRelatedEvents = e.target.selected
    if (this._showFamilyEvents || this._showRelatedEvents) {
      fireEvent(this, 'person:timeline-needed')
    }
  }

  // Build a single combined ordered list from the timeline. Personal events
  // are always included; family/related are gated by their toggle. The
  // timeline API returns events in chronological order, so we preserve that
  // ordering.
  _getCombinedTimelineEvents() {
    const personalHandles = new Set(
      (this.data?.extended?.events || []).map(e => e.handle)
    )
    const familyEventHandles = new Set(
      (this.data?.extended?.families || [])
        .flatMap(f => f.event_ref_list || [])
        .map(er => er.ref)
    )

    // The timeline API returns events in chronological order. Use each
    // event's position in that array as a sort key so we can interleave
    // personal and family/related events correctly.
    const timelineOrder = new Map(
      this.timelineData.map((te, i) => [te.handle, i])
    )
    const timelineAge = new Map(
      this.timelineData.map(te => [te.handle, te.age || ''])
    )

    const entries = []

    // Personal events: always from main data (timeline may omit undated ones).
    for (const [i, event] of (this.data?.extended?.events || []).entries()) {
      const sortKey = timelineOrder.has(event.handle)
        ? timelineOrder.get(event.handle)
        : event.date?.sortval ?? Infinity
      const baseProfile = (this.data?.profile?.events || [])[i] || {}
      entries.push({
        sortKey,
        data: event,
        profile: {...baseProfile, age: timelineAge.get(event.handle) || ''},
      })
    }

    // Family/related events: only from timeline.
    for (const te of this.timelineData) {
      if (personalHandles.has(te.handle)) continue
      if (familyEventHandles.has(te.handle)) {
        if (!this._showFamilyEvents) continue
      } else {
        if (!this._showRelatedEvents) continue
      }
      const isRelated = !familyEventHandles.has(te.handle)
      const personName = isRelated
        ? [te.person?.name_given, te.person?.name_surname]
            .filter(Boolean)
            .join(' ')
        : ''
      entries.push({
        sortKey: timelineOrder.get(te.handle),
        data: {
          gramps_id: te.gramps_id,
          handle: te.handle,
          type: te.type,
          description: te.description || '',
          media_list: (te.media || []).map(h => ({ref: h})),
        },
        profile: {
          type: this._(te.type),
          date: te.date || '',
          place: te.place?.name || '',
          place_name: te.place?.name || '',
          role: isRelated ? te.person?.relationship || '' : '',
          summary: te.label || te.type || '',
          context: isRelated ? personName : this._('Family'),
          age: te.age || '',
        },
      })
    }

    entries.sort((a, b) => a.sortKey - b.sortKey)

    return {
      data: entries.map(e => e.data),
      profile: entries.map(e => e.profile),
    }
  }

  renderSectionContent(sectionKey) {
    if (sectionKey !== 'events' || this.edit) {
      return super.renderSectionContent(sectionKey)
    }

    const hasFamilies =
      (this.data?.family_list?.length || 0) +
        (this.data?.parent_family_list?.length || 0) >
      0

    const chips = hasFamilies
      ? html`
          <div class="events-chips">
            <md-chip-set>
              <md-filter-chip
                label="${this._('Personal')}"
                selected
                @click="${e => {
                  e.target.selected = true
                }}"
              ></md-filter-chip>
              <md-filter-chip
                label="${this._('Family')}"
                ?selected="${this._showFamilyEvents}"
                @click="${this._handleFamilyEventsToggle}"
              ></md-filter-chip>
              <md-filter-chip
                label="${this._('Relatives')}"
                ?selected="${this._showRelatedEvents}"
                @click="${this._handleRelatedEventsToggle}"
              ></md-filter-chip>
            </md-chip-set>
          </div>
        `
      : ''

    // While neither toggle is active (or timeline not yet loaded), show
    // the normal personal events list with full edit capability.
    if (
      (!this._showFamilyEvents && !this._showRelatedEvents) ||
      !this.timelineData.length
    ) {
      return html`
        ${chips}
        <grampsjs-events
          hasShare
          hasAdd
          hasEdit
          defaultRole="Primary"
          .appState="${this.appState}"
          .data=${this.data?.extended?.events}
          .profile=${this.data?.profile?.events}
          .eventRef=${this.data?.event_ref_list}
        ></grampsjs-events>
      `
    }

    // Combined chronological view using the timeline endpoint.
    const {data, profile} = this._getCombinedTimelineEvents()
    return html`
      ${chips}
      <grampsjs-events
        .appState="${this.appState}"
        .data=${data}
        .profile=${profile}
      ></grampsjs-events>
    `
  }
}

window.customElements.define('grampsjs-person', GrampsjsPerson)
