import {html, css} from 'lit'

import '@material/web/button/text-button.js'

import './GrampsjsIcon.js'
import './GrampsjsGallery.js'
import './GrampsjsEvents.js'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import {fireEvent, personProfileDisplayName} from '../util.js'
import {sharedStyles} from '../SharedStyles.js'

export class GrampsjsPersonBox extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      sharedStyles,
      css`
        h2,
        h3,
        h4 {
          font-family: var(--grampsjs-body-font-family);
        }

        h2 {
          font-weight: 500;
          font-size: 22px;
          margin-top: 10px;
          margin-bottom: 0;
        }

        h3 {
          font-weight: 400;
          font-size: 18px;
          margin-top: 14px;
          margin-bottom: 7px;
        }

        :host {
          font-size: 16px;
        }

        .right {
          text-align: right;
        }

        p {
          margin-top: 0.6em;
          margin-bottom: 0.6em;
        }

        .dates {
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
          margin-top: 6px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      handle: {type: String},
      name: {type: String},
      // Pre-fetched person data from parent; when set, skips the internal fetch.
      personData: {type: Object},
    }
  }

  constructor() {
    super()
    this.handle = ''
    this.name = ''
    this.personData = null
  }

  getUrl() {
    if (!this.handle || this.personData) return ''
    const lang = this.appState?.i18n?.lang || 'en'
    return `/api/people/${this.handle}?extend=all&profile=all&locale=${lang}`
  }

  render() {
    if (this.personData) return this.renderContent()
    return super.render()
  }

  renderContent() {
    const person = this.personData || this._data?.data
    if (!person) return ''
    const fullName = personProfileDisplayName(person.profile)
    const birthDate = person.profile?.birth?.date || ''
    const birthPlace = person.profile?.birth?.place_name || ''
    const deathDate = person.profile?.death?.date || ''
    const deathPlace = person.profile?.death?.place_name || ''
    return html`
      <h2>${fullName || this.name || this._('Person')}</h2>
      <div class="dates">
        ${birthDate || birthPlace
          ? html`<p>
              ∗ ${[birthDate, birthPlace].filter(Boolean).join(' · ')}
            </p>`
          : ''}
        ${deathDate || deathPlace
          ? html`<p>
              † ${[deathDate, deathPlace].filter(Boolean).join(' · ')}
            </p>`
          : ''}
      </div>
      ${person.media_list?.length
        ? html`
            <h3>${this._('Gallery')}</h3>
            <grampsjs-gallery
              .appState="${this.appState}"
              .media="${person.extended?.media || []}"
              .mediaRef="${person.media_list}"
            ></grampsjs-gallery>
          `
        : ''}
      ${person.extended?.events?.length
        ? html`
            <h3>${this._('Events')}</h3>
            <grampsjs-events
              .appState="${this.appState}"
              .data="${person.extended.events}"
              .profile="${person.profile?.events || []}"
              .eventRef="${person.event_ref_list || []}"
              sorted
              hideAge
              @grampsjs-events:place-hover="${this._handlePlaceHover}"
            ></grampsjs-events>
          `
        : ''}
      <div class="right">
        <md-text-button @click="${this._handleDetailClick}"
          >${this._('Show Details')}</md-text-button
        >
      </div>
    `
  }

  renderLoading() {
    return html`
      <h2>
        ${this.name || html`<span class="skeleton skeleton-text">&nbsp;</span>`}
      </h2>
      <span class="skeleton skeleton-text" style="width:60%">&nbsp;</span>
      <span class="skeleton skeleton-text" style="width:80%">&nbsp;</span>
    `
  }

  _handleDetailClick() {
    const id = (this.personData || this._data?.data)?.gramps_id
    if (id) fireEvent(this, 'nav', {path: `person/${id}`})
  }

  _handlePlaceHover(e) {
    fireEvent(window, 'map:place-active', {handle: e.detail.handle})
  }
}

window.customElements.define('grampsjs-person-box', GrampsjsPersonBox)
