import {LitElement, css, html} from 'lit'

import '@material/web/button/filled-button'
import '@material/web/button/outlined-button'
import '@material/web/textfield/filled-text-field'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

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

export class GrampsjsResearcher extends GrampsjsAppStateMixin(LitElement) {
  static get properties() {
    return {
      readonly: {type: Boolean},
      _editing: {type: Boolean},
      _loading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.readonly = false
    this._editing = false
    this._loading = false
  }

  static get styles() {
    return css`
      th,
      td {
        font-size: 1em;
        font-weight: 300;
        padding: 6px 24px 6px 0;
        text-align: left;
        vertical-align: top;
      }

      th {
        font-weight: 500;
        color: var(--md-sys-color-on-surface-variant, inherit);
        white-space: nowrap;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px 24px;
        margin-top: 1em;
      }

      .form-actions {
        margin-top: 1.2em;
        display: flex;
        gap: 0.75em;
      }
    `
  }

  render() {
    if (!this.readonly && this._editing) {
      return this._renderEditForm()
    }
    return this._renderReadOnly()
  }

  _renderReadOnly() {
    const address = this._buildAddress()
    const researcher = this.appState.dbInfo?.researcher || {}
    return html`
      <table>
        <tr>
          <th>${this._('Name')}</th>
          <td>${researcher.name || '–'}</td>
        </tr>
        <tr>
          <th>${this._('E-mail')}</th>
          <td>
            ${researcher.email
              ? html`<a href="mailto:${researcher.email}"
                  >${researcher.email}</a
                >`
              : '–'}
          </td>
        </tr>
        <tr>
          <th>${this._('Phone')}</th>
          <td>
            ${researcher.phone
              ? html`<a href="tel:${researcher.phone}">${researcher.phone}</a>`
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
      ${!this.readonly
        ? html`<p>
            <md-outlined-button @click="${() => (this._editing = true)}">
              ${this._('Edit')}
            </md-outlined-button>
          </p>`
        : ''}
    `
  }

  _renderEditForm() {
    const researcher = this.appState.dbInfo?.researcher || {}
    return html`
      <div class="form-grid">
        ${FIELDS.map(
          ({id, label}) => html`
            <md-filled-text-field
              id="field-${id}"
              label="${this._(label)}"
              value="${researcher[id] || ''}"
            ></md-filled-text-field>
          `
        )}
      </div>
      <div class="form-actions">
        <md-filled-button
          ?disabled="${this._loading}"
          @click="${this._handleSave}"
        >
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
      if (field) payload[id] = field.value
    }
    this._loading = true
    const data = await this.appState.apiPut(
      '/api/metadata/researcher/',
      payload
    )
    this._loading = false
    if (!('error' in data)) {
      this._editing = false
    }
  }

  _buildAddress() {
    const r = this.appState.dbInfo?.researcher
    if (!r) return null
    const parts = [
      r.addr,
      r.locality,
      r.city,
      r.county,
      r.state,
      r.country,
      r.postal,
    ].filter(Boolean)
    return parts.length ? parts.join(', ') : null
  }
}

window.customElements.define('grampsjs-researcher', GrampsjsResearcher)
