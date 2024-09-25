import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsImport.js'
import '../components/GrampsjsImportMedia.js'
import '../components/GrampsjsMediaFileStatus.js'
import '../components/GrampsjsMediaStatus.js'
import '../components/GrampsjsDeleteAll.js'
import '../components/GrampsjsRelogin.js'
import '../components/GrampsjsTaskProgressIndicator.js'
import '../components/GrampsjsTreeQuotas.js'
import {apiPost, isTokenFresh} from '../api.js'
import {fireEvent, clickKeyHandler} from '../util.js'
import '@material/mwc-button'

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

        .danger-zone {
          font-size: 16px;
          padding: 0.8em 1.4em;
          border: 1px solid #bf360c;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .danger-zone div.text {
          order: 1;
          display: inline-block;
          padding-right: 1.2em;
        }

        .danger-zone div.button {
          float: right;
          order: 2;
          --mdc-button-outline-color: #bf360c;
          --mdc-theme-primary: #bf360c;
        }

        .danger-zone p {
          margin: 0.4em 0;
        }

        .bold {
          font-weight: 500;
        }

        mwc-icon.status {
          font-size: 18px;
          top: 4px;
          position: relative;
          margin-right: 5px;
        }

        .small {
          font-size: 16px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      userData: {type: Array},
      dbInfo: {type: Object},
      userInfo: {type: Object},
      _repairResults: {type: Object},
      _buttonUpdateSearchDisabled: {type: Boolean},
      _buttonUpdateSearchSemanticDisabled: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.userData = []
    this.dbInfo = {}
    this.userInfo = {}
    this._repairResults = {}
    this._buttonUpdateSearchDisabled = false
    this._buttonUpdateSearchSemanticDisabled = false
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

      ${this._renderSearchStatus()}

      <p>
        ${this._(
          'Manually updating the search index is usually unnecessary, but it may become necessary after an upgrade.'
        )}
      </p>
      <mwc-button
        outlined
        ?disabled=${this._buttonUpdateSearchDisabled}
        @click="${() => this._updateSearch(false)}"
        @keydown="${clickKeyHandler}"
        >${this._('Update search index')}</mwc-button
      >
      <grampsjs-task-progress-indicator
        class="button"
        id="progress-update-search"
        taskName="searchReindexFull"
        size="20"
        pollInterval="0.2"
        @task:complete="${this._handleSuccessUpdateSearch}"
      ></grampsjs-task-progress-indicator>

      ${this.dbInfo?.server?.semantic_search
        ? html`
            <h3>${this._('Manage semantic search index')}</h3>

            ${this._renderSearchStatus(true)}

            <p>
              ${this._(
                'Updating the semantic search index requires substantial time and computational resources. Run this operation only when necessary.'
              )}
            </p>
            <mwc-button
              outlined
              ?disabled=${this._buttonUpdateSearchSemanticDisabled}
              @click="${() => this._updateSearch(true)}"
              @keydown="${clickKeyHandler}"
              >${this._('Update semantic search index')}</mwc-button
            >
            <grampsjs-task-progress-indicator
              class="button"
              id="progress-update-search-semantic"
              taskName="searchReindexFullSemantic"
              size="20"
              pollInterval="0.2"
              @task:complete="${this._handleSuccessUpdateSearch}"
            ></grampsjs-task-progress-indicator>
          `
        : ''}
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
        taskName="repairDb"
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
      <h3>${this._('Danger Zone')}</h3>
      <div class="danger-zone">
        <div class="text">
          <p class="bold">${this._('Delete all objects')}</p>
          <p>
            ${this._(
              'Clear the family tree by removing all existing objects. Optionally, select specific types of objects for deletion.'
            )}
          </p>
        </div>
        <div class="button">
          <grampsjs-task-progress-indicator
            class="button-left"
            id="progress-delete-all"
            taskName="deleteObjects"
            size="20"
            pollInterval="0.2"
          ></grampsjs-task-progress-indicator>
          <mwc-button
            outlined
            @click="${this._openDeleteAll}"
            @keydown="${clickKeyHandler}"
            icon="delete_forever"
            >${this._('Delete')}</mwc-button
          >
        </div>
      </div>
      <grampsjs-delete-all
        .strings="${this.strings}"
        @delete-objects="${this._handleDeleteAll}"
      ></grampsjs-delete-all>
      <grampsjs-relogin
        .strings="${this.strings}"
        @relogin="${this._openDeleteAll}"
        username="${this.userInfo?.name || ''}"
      ></grampsjs-relogin>
    `
  }

  _renderSearchStatus(semantic = false) {
    const property = semantic ? 'count_semantic' : 'count'
    const count = this.dbInfo?.search?.sifts?.[property] ?? -1
    const objCounts = this.dbInfo?.object_counts ?? {}
    const objCount = Object.values(objCounts).reduce(
      (sum, value) => sum + value,
      0
    )
    const iconError = html`<mwc-icon class="error status">error</mwc-icon>`
    const iconOk = html`<mwc-icon class="success status"
      >check_circle</mwc-icon
    >`
    const icon = objCount === 0 || count / objCount > 0.98 ? iconOk : iconError
    return html`<p class="small">
      ${icon} ${this._('Status')}:
      ${count === -1 ? this._('unknown') : count}/${objCount}
    </p>`
  }

  _openDeleteAll() {
    if (isTokenFresh()) {
      this.renderRoot.querySelector('grampsjs-delete-all').show()
    } else {
      this.renderRoot.querySelector('grampsjs-relogin').show()
    }
  }

  async _handleDeleteAll(e) {
    const prog = this.renderRoot.querySelector('#progress-delete-all')
    prog.reset()
    prog.open = true
    const querypar = e.detail.namespaces
      ? `?namespaces=${e.detail.namespaces}`
      : ''
    const url = `/api/objects/delete/${querypar}`
    const data = await apiPost(url, null, true, true, true)
    if ('error' in data) {
      prog.setError()
      prog.errorMessage = data.error
    } else if ('task' in data) {
      prog.taskId = data.task?.id || ''
    } else {
      prog.setComplete()
      fireEvent(this, 'db:changed')
    }
  }

  async _updateSearch(semantic = false) {
    const id = semantic
      ? 'progress-update-search-semantic'
      : 'progress-update-search'
    const prog = this.renderRoot.querySelector(`#${id}`)
    prog.reset()
    prog.open = true
    const url = semantic
      ? '/api/search/index/?full=1&semantic=1'
      : '/api/search/index/?full=1'
    if (semantic) {
      this._buttonUpdateSearchSemanticDisabled = true
    } else {
      this._buttonUpdateSearchDisabled = true
    }
    const data = await apiPost(url)
    if ('error' in data) {
      prog.setError()
      prog.errorMessage = data.error
      this._doneUpdateSearch(semantic)
    } else if ('task' in data) {
      prog.taskId = data.task?.id || ''
    } else {
      prog.setComplete()
      this._handleSuccessUpdateSearch(semantic)
    }
  }

  _handleSuccessUpdateSearch(semantic = false) {
    this._doneUpdateSearch(semantic)
    fireEvent(this, 'db:changed')
  }

  _doneUpdateSearch(semantic = false) {
    if (semantic) {
      this._buttonUpdateSearchSemanticDisabled = false
    } else {
      this._buttonUpdateSearchDisabled = false
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
