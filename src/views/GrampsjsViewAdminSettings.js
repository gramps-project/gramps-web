import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsImport.js'
import '../components/GrampsjsImportMedia.js'
import '../components/GrampsjsMediaFileStatus.js'
import '../components/GrampsjsMediaStatus.js'
import '../components/GrampsjsTaskProgressIndicator.js'
import '../components/GrampsjsTreeQuotas.js'
import {apiPost} from '../api.js'
import '@material/mwc-button'

import {clickKeyHandler} from '../util.js'

export class GrampsjsViewAdminSettings extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
        }

        .card {
          padding: 1em 1em;
          border-radius: 16px;
          background-color: rgba(109, 76, 65, 0.12);
        }

        .pre {
          white-space: pre-line;
        }
      `,
    ]
  }

  static get properties() {
    return {
      userData: {type: Array},
      dbInfo: {type: Object},
      _repairResults: {type: Object},
    }
  }

  constructor() {
    super()
    this.userData = []
    this.dbInfo = {}
    this._repairResults = {}
  }

  renderContent() {
    return html`
      <h3>${this._('Usage quotas')}</h3>

      <grampsjs-tree-quotas .strings="${this.strings}"></grampsjs-tree-quotas>

      <grampsjs-media-status .strings="${this.strings}"></grampsjs-media-status>
      ${this.dbInfo?.object_counts?.media
        ? html`<grampsjs-media-file-status
            .strings="${this.strings}"
          ></grampsjs-media-file-status>`
        : ''}

      <grampsjs-import .strings="${this.strings}"></grampsjs-import>

      <grampsjs-import-media .strings="${this.strings}"></grampsjs-import-media>

      <h3>${this._('Manage search index')}</h3>

      <p>
        ${this._(
          'Manually updating the search index is usually unnecessary, but it may become necessary after an upgrade.'
        )}
      </p>
      <mwc-button
        outlined
        @click="${this._updateSearch}"
        @keydown="${clickKeyHandler}"
        >${this._('Update search index')}</mwc-button
      >
      <grampsjs-task-progress-indicator
        class="button"
        id="progress-update-search"
        size="20"
        pollInterval="0.2"
      ></grampsjs-task-progress-indicator>

      <h3>${this._('Check and Repair Database')}</h3>

      <p>
        ${this._(
          'This tool checks the database for integrity problems, fixing the problems it can.'
        )}
      </p>
      <mwc-button
        outlined
        @click="${this._checkRepair}"
        @keydown="${clickKeyHandler}"
        >${this._('Check and Repair')}</mwc-button
      >
      <grampsjs-task-progress-indicator
        class="button"
        id="progress-repair"
        size="20"
        pollInterval="0.2"
        @task:complete="${this._handleRepairComplete}"
      ></grampsjs-task-progress-indicator>

      ${this._repairResults?.num_errors !== undefined
        ? html`<p class="card">
            ${this._repairResults.num_errors === 0
              ? this._(
                  'No errors were found: the database has passed internal checks.'
                )
              : html`<span class="pre">${this._repairResults.message}</span>`}
          </p>`
        : ''}
    `
  }

  async _updateSearch() {
    const prog = this.renderRoot.querySelector('#progress-update-search')
    prog.reset()
    prog.open = true
    const data = await apiPost('/api/search/index/?full=1')
    if ('error' in data) {
      prog.setError()
      prog.errorMessage = data.error
    } else if ('task' in data) {
      prog.taskId = data.task?.id || ''
    } else {
      prog.setComplete()
    }
  }

  async _checkRepair() {
    this._repairResults = {}
    const prog = this.renderRoot.querySelector('#progress-repair')
    prog.reset()
    prog.open = true
    const data = await apiPost('/api/trees/-/repair')
    if ('error' in data) {
      prog.setError()
      prog.errorMessage = data.error
    } else if ('task' in data) {
      prog.taskId = data.task?.id || ''
    } else {
      prog.setComplete()
    }
  }

  _handleRepairComplete(e) {
    const info = e.detail?.status?.info
    if (info !== undefined) {
      this._repairResults = JSON.parse(info)
    }
  }
}

window.customElements.define(
  'grampsjs-view-admin-settings',
  GrampsjsViewAdminSettings
)
