import {css, html} from 'lit'

import '@material/web/button/filled-button'
import '@material/web/button/outlined-button'
import '@material/web/textfield/outlined-text-field'

import {GrampsjsView} from './GrampsjsView.js'
import {fireEvent} from '../util.js'

const FIELDS = [
  {id: 'name', label: 'Name'},
  {id: 'email', label: 'E-mail'},
  {id: 'phone', label: 'Phone'},
  {id: 'addr', label: 'Address'},
  {id: 'locality', label: 'Locality'},
  {id: 'city', label: 'City'},
  {id: 'state', label: 'State'},
  {id: 'county', label: 'County'},
  {id: 'country', label: 'Country'},
  {id: 'postal', label: 'Postal Code'},
]

export class GrampsjsViewResearcher extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        th,
        td {
          font-size: 14px;
          font-weight: 300;
          height: 20px;
          padding-bottom: 10px;
          padding-top: 10px;
          padding-right: 25px;
          padding-left: 0;
          text-align: left;
        }

        th {
          font-weight: 450;
          color: var(--grampsjs-body-font-color-100);
          text-align: right;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px 24px;
          margin-top: 1em;
        }

        .form-actions {
          margin-top: 1.2em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _editing: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._editing = false
  }

  renderContent() {
    if (this._editing) {
      return this._renderEditForm()
    }
    return this._renderReadOnly()
  }

  _renderReadOnly() {
    const address = this._buildAddress()
    const canEdit = this.appState.permissions.canEditTree

    return html`
      <h3>${this._('Researcher Information')}</h3>

      <h4>${this.appState.dbInfo.researcher?.name || '–'}</h4>

      <table>
        <tr>
          <th>${this._('E-mail')}</th>
          <td>
            ${this.appState.dbInfo.researcher?.email
              ? html`<a href="mailto:${this.appState.dbInfo.researcher.email}"
                  >${this.appState.dbInfo.researcher.email}</a
                >`
              : '–'}
          </td>
        </tr>
        <tr>
          <th>${this._('Phone')}</th>
          <td>
            ${this.appState.dbInfo.researcher?.phone
              ? html`<a href="tel:${this.appState.dbInfo.researcher.phone}"
                  >${this.appState.dbInfo.researcher.phone}</a
                >`
              : '–'}
          </td>
        </tr>
        ${address
          ? html`<tr>
              <th>${this._('Address')}</th>
              <td>${address}</td>
            </tr>`
          : ''}
      </table>

      ${canEdit
        ? html`<p>
            <md-outlined-button @click="${() => (this._editing = true)}">
              ${this._('Edit')}
            </md-outlined-button>
          </p>`
        : ''}
    `
  }

  _renderEditForm() {
    const researcher = this.appState.dbInfo.researcher || {}
    return html`
      <h3>${this._('Researcher Information')}</h3>

      <div class="form-grid">
        ${FIELDS.map(
          ({id, label}) => html`
            <md-outlined-text-field
              id="field-${id}"
              label="${this._(label)}"
              value="${researcher[id] || ''}"
            ></md-outlined-text-field>
          `
        )}
      </div>

      <div class="form-actions">
        <md-filled-button @click="${this._handleSave}">
          ${this._('_Save')}
        </md-filled-button>
        <md-outlined-button @click="${() => (this._editing = false)}">
          ${this._('Cancel')}
        </md-outlined-button>
      </div>
    `
  }

  async _handleSave() {
    const payload = {}
    for (const {id} of FIELDS) {
      const field = this.shadowRoot.getElementById(`field-${id}`)
      if (field) {
        payload[id] = field.value
      }
    }

    this.loading = true
    const data = await this.appState.apiPut(
      '/api/metadata/researcher/',
      payload
    )
    this.loading = false

    if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
      return
    }

    this.error = false
    this._editing = false
    fireEvent(this, 'db:changed')
  }

  _buildAddress() {
    const address = []

    if (!this.appState.dbInfo.researcher) {
      return null
    }

    ;[
      this.appState.dbInfo.researcher.addr,
      this.appState.dbInfo.researcher.locality,
      this.appState.dbInfo.researcher.city,
      this.appState.dbInfo.researcher.county,
      this.appState.dbInfo.researcher.state,
      this.appState.dbInfo.researcher.country,
      this.appState.dbInfo.researcher.postal,
    ]
      .filter(value => value)
      .forEach(value => address.push(value))

    return address.length === 0 ? null : address.join(', ')
  }
}

window.customElements.define('grampsjs-view-researcher', GrampsjsViewResearcher)
