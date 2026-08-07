import {html, css} from 'lit'

import '@material/web/iconbutton/icon-button.js'

import {mdiPencil} from '@mdi/js'

import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsjsIcon.js'
import './GrampsjsFormEditCitationDetails.js'
import {emptyDate, fireEvent, linkUrls, objectIconPath} from '../util.js'

const BASE_DIR = ''

const confidence = {
  0: 'Very Low',
  1: 'Low',
  2: 'Normal',
  3: 'High',
  4: 'Very High',
}

export class GrampsjsCitation extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
        }
      `,
    ]
  }

  constructor() {
    super()
    this._objectsName = 'Citations'
    this._objectEndpoint = 'citations'
    this._objectIcon = objectIconPath.citation
  }

  renderProfile() {
    return html`
      <h2>${this._('Citation')}</h2>

      <dl>
        ${this.data?.profile?.date
          ? html`
              <div>
                <dt>${this._('Date')}</dt>
                <dd>${this.data.profile.date}</dd>
              </div>
            `
          : ''}
        <div>
          <dt>${this._('Source')}</dt>
          <dd>
            <a href="${BASE_DIR}/source/${this.data.extended.source.gramps_id}"
              >${this.data.extended.source.title ||
              this.data.extended.source.gramps_id}</a
            >
          </dd>
        </div>
        ${this.data?.page
          ? html`
              <div>
                <dt>${this._('Page')}</dt>
                <dd>${linkUrls(this.data.page, false)}</dd>
              </div>
            `
          : ''}
        <div>
          <dt>${this._('Confidence')}</dt>
          <dd>${this._(confidence[this.data.confidence])}</dd>
        </div>
      </dl>
      ${this.edit
        ? html`
            <md-icon-button
              class="edit"
              aria-label="${this._('Edit')}"
              @click="${this._handleEditDetails}"
            >
              <grampsjs-icon
                path="${mdiPencil}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
          `
        : ''}
    `
  }

  // eslint-disable-next-line class-methods-use-this
  renderPicture() {
    return ''
  }

  _handleEditDetails() {
    const data = {
      date: this.data.date ?? emptyDate,
      confidence: this.data.confidence,
      source_handle: this.data.source_handle,
      page: this.data.page,
    }
    const source = this.data?.extended?.source
    this.dialogContent = html`
      <grampsjs-form-edit-citation-details
        @object:save="${this._handleSaveDetails}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .data=${data}
        .source=${source}
      >
      </grampsjs-form-edit-citation-details>
    `
  }

  _handleSaveDetails(e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-citation', GrampsjsCitation)
