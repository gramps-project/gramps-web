import {css, html} from 'lit'

import '@material/mwc-linear-progress'
import '@material/mwc-button'
import '@material/mwc-textfield'
import '@material/mwc-dialog'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import {fireEvent, clickKeyHandler} from '../util.js'

function _getProgress(usage, quota) {
  if (usage === undefined || quota === undefined) {
    return 0
  }
  if (usage === 0) {
    return 0
  }
  if (quota === null) {
    return 0
  }
  return usage / quota
}

function formatBytes(bytes) {
  if (bytes === null) {
    return null
  }
  if (bytes === 0) {
    return '0 B'
  }
  const prefixes = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']
  const base = 1000
  const exponent = Math.floor(Math.log10(bytes) / Math.log10(base))

  return `${(bytes / base ** exponent).toFixed(1)} ${prefixes[exponent]}B`
}

export class GrampsjsTreeQuotas extends GrampsjsConnectedComponent {
  static get properties() {
    return {
      _isEditing: {type: Boolean},
      _editQuotas: {type: Object},
      _isLoading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._isEditing = false
    this._editQuotas = {}
    this._isLoading = false
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        mwc-linear-progress {
        }

        span.label {
        }

        div.progress {
          max-width: 100px;
          height: 20px;
          margin-left: 20px;
        }

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
          color: rgba(0, 0, 0, 0.6);
          text-align: right;
        }

        td.progress {
          width: 100px;
        }

        td.numbers {
          font-size: 14px;
        }

        .edit-button {
          margin-top: 1em;
        }

        .quota-form {
          display: grid;
          gap: 1em;
          margin-top: 1em;
        }

        .quota-form mwc-textfield {
          width: 100%;
        }

        .dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1em;
          margin-top: 1em;
        }
      `,
    ]
  }

  renderContent() {
    const {data} = this._data
    if (!data) {
      return html`${this._('Error')}`
    }
    const usagePeople =
      data.usage_people === undefined || data.usage_people === null
        ? this._('unknown')
        : data.usage_people
    const quotaPeople =
      'quota_people' in data
        ? data.quota_people || html`&infin;`
        : this._('unknown')
    const usageMedia =
      data.usage_media === undefined || data.usage_media === null
        ? this._('unknown')
        : formatBytes(data.usage_media)
    const quotaMedia =
      'quota_media' in data
        ? formatBytes(data.quota_media) || html`&infin;`
        : this._('unknown')
    const usageAi =
      data.usage_ai === undefined || data.usage_ai === null
        ? this._('unknown')
        : data.usage_ai
    const quotaAi =
      'quota_ai' in data ? data.quota_ai || html`&infin;` : this._('unknown')
    const progressPeople = _getProgress(data.usage_people, data.quota_people)
    const progressMedia = _getProgress(data.usage_media, data.quota_media)
    const progressAi = _getProgress(data.usage_ai, data.quota_ai)
    return html`
      <table>
        <tr>
          <th>${this._('Number of people')}</th>
          <td class="progress">
            <mwc-linear-progress
              progress="${progressPeople}"
            ></mwc-linear-progress>
          </td>
          <td class="numbers">
            ${Math.round(100 * progressPeople)}%
            (&hairsp;${usagePeople}&thinsp;/&thinsp;${quotaPeople}&hairsp;)
          </td>
        </tr>
        <tr>
          <th>${this._('Total size of media objects')}</th>
          <td class="progress">
            <mwc-linear-progress
              progress="${progressMedia}"
            ></mwc-linear-progress>
          </td>
          <td class="numbers">
            ${Math.round(100 * progressMedia)}%
            (&hairsp;${usageMedia}&thinsp;/&thinsp;${quotaMedia}&hairsp;)
          </td>
        </tr>
        ${'usage_ai' in data
          ? html`
              <tr>
                <th>${this._('Chat messages')}</th>
                <td class="progress">
                  <mwc-linear-progress
                    progress="${progressAi}"
                  ></mwc-linear-progress>
                </td>
                <td class="numbers">
                  ${Math.round(100 * progressAi)}%
                  (&hairsp;${usageAi}&thinsp;/&thinsp;${quotaAi}&hairsp;)
                </td>
              </tr>
            `
          : ''}
      </table>

      <mwc-button
        class="edit-button"
        outlined
        @click="${this._openEditDialog}"
        @keydown="${clickKeyHandler}"
      >
        ${this._('Edit Quotas')}
      </mwc-button>

      <mwc-dialog
        id="edit-quotas-dialog"
        heading="${this._('Edit Upload Quotas')}"
        ?open="${this._isEditing}"
        @closed="${this._closeEditDialog}"
      >
        <div class="quota-form">
          <mwc-textfield
            id="quota-people"
            label="${this._('Max number of people')}"
            type="number"
            min="0"
            value="${this._editQuotas.quota_people || ''}"
            @input="${this._handleQuotaChange}"
          ></mwc-textfield>

          <mwc-textfield
            id="quota-media"
            label="${this._('Max media size (MB)')}"
            type="number"
            min="0"
            value="${this._editQuotas.quota_media
              ? Math.round(this._editQuotas.quota_media / (1024 * 1024))
              : ''}"
            @input="${this._handleQuotaChange}"
          ></mwc-textfield>
        </div>

        <div class="dialog-actions" slot="primaryAction">
          <mwc-button
            outlined
            @click="${this._closeEditDialog}"
            @keydown="${clickKeyHandler}"
          >
            ${this._('Cancel')}
          </mwc-button>
          <mwc-button
            raised
            ?disabled="${this._isLoading}"
            @click="${this._saveQuotas}"
            @keydown="${clickKeyHandler}"
          >
            ${this._isLoading ? this._('Saving...') : this._('Save')}
          </mwc-button>
        </div>
      </mwc-dialog>
    `
  }

  renderLoading() {
    return html`
      <table>
        <tr>
          <th>${this._('Number of people')}</th>
          <td class="progress">
            <mwc-linear-progress indeterminate></mwc-linear-progress>
          </td>
          <td class="numbers">
            <span class="skeleton" style="width: 6em;">&nbsp;</span>
          </td>
        </tr>
        <tr>
          <th>${this._('Total size of media objects')}</th>
          <td class="progress">
            <mwc-linear-progress indeterminate></mwc-linear-progress>
          </td>
          <td class="numbers">
            <span class="skeleton" style="width: 7em;">&nbsp;</span>
          </td>
        </tr>
      </table>
    `
  }

  _openEditDialog() {
    const {data} = this._data
    if (data) {
      this._editQuotas = {
        quota_people: data.quota_people || null,
        quota_media: data.quota_media || null,
      }
    }
    this._isEditing = true
  }

  _closeEditDialog() {
    this._isEditing = false
  }

  _handleQuotaChange(e) {
    const {id} = e.target
    let value = parseInt(e.target.value, 10) || null

    // Convert MB to bytes for media quota
    if (id === 'quota-media' && value !== null) {
      value = value * 1024 * 1024
    }

    this._editQuotas = {
      ...this._editQuotas,
      [id.replace('quota-', 'quota_')]: value,
    }

    console.log('Updated editQuotas:', this._editQuotas)
  }

  async _saveQuotas() {
    this._isLoading = true

    try {
      console.log('Sending quota data:', this._editQuotas)

      // Send only supported fields
      const testPayload = {}

      if (this._editQuotas.quota_people !== undefined) {
        testPayload.quota_people = this._editQuotas.quota_people
      }
      if (this._editQuotas.quota_media !== undefined) {
        testPayload.quota_media = this._editQuotas.quota_media
      }
      // quota_ai is not supported by the API

      console.log('Sending supported fields:', testPayload)

      console.log('Test payload:', testPayload)
      const data = await this.appState.apiPut('/api/trees/-', testPayload)

      if ('error' in data) {
        console.error('API error:', data.error)
        fireEvent(this, 'grampsjs:error', {message: data.error})
      } else {
        fireEvent(this, 'grampsjs:notification', {
          message: this._('Quotas updated successfully'),
          type: 'success',
        })
        this._closeEditDialog()
        // Refresh data
        this._updateData()
      }
    } catch (error) {
      console.error('Error updating quotas:', error)
      fireEvent(this, 'grampsjs:notification', {
        message: this._('Error updating quotas'),
        type: 'error',
      })
    } finally {
      this._isLoading = false
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    return '/api/trees/-'
  }
}

window.customElements.define('grampsjs-tree-quotas', GrampsjsTreeQuotas)
