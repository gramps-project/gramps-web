import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsCollapsibleSection.js'
import '../components/GrampsjsResearcher.js'
import '../components/GrampsjsImport.js'
import '../components/GrampsjsImportMedia.js'
import '../components/GrampsjsMediaFileStatus.js'
import '../components/GrampsjsMediaStatus.js'
import '../components/GrampsjsDeleteAll.js'
import '../components/GrampsjsRelogin.js'
import '../components/GrampsjsTaskProgressIndicator.js'
import '../components/GrampsjsTreeQuotas.js'

import {fireEvent} from '../util.js'
import {
  TREE_CONFIG_APP_TITLE,
  TREE_CONFIG_PRIMARY_COLOR,
  TREE_CONFIG_SECONDARY_COLOR,
  TREE_CONFIG_HOME_PAGE_NOTE,
  TREE_CONFIG_HOME_PAGE_IMAGE,
} from '../api.js'
import {DEFAULT_PRIMARY, DEFAULT_SECONDARY} from '../theme.js'
import {mdiDeleteForever, mdiDownload, mdiUpload} from '@mdi/js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsFormUpload.js'
import '../components/GrampsjsFormSelectObject.js'
import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import '@material/web/button/filled-button.js'
import '@awesome.me/webawesome/dist/components/color-picker/color-picker.js'
import '@material/web/button/outlined-button.js'
import '@material/web/textfield/filled-text-field.js'

export class GrampsjsViewAdminSettings extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .card {
          padding: 1em 1em;
          border-radius: 16px;
          background-color: var(--grampsjs-color-shade-230);
        }

        .pre {
          white-space: pre-line;
        }

        .danger-zone {
          font-size: 16px;
          padding: 0.8em 1.4em;
          border: 1px solid var(--grampsjs-alert-error-font-color);
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
        }

        .danger-button {
          --md-outlined-button-label-text-color: var(
            --grampsjs-alert-error-font-color
          );
          --md-outlined-button-focus-label-text-color: var(
            --grampsjs-alert-error-font-color
          );
          --md-outlined-button-hover-label-text-color: var(
            --grampsjs-alert-error-font-color
          );
          --md-outlined-button-pressed-label-text-color: var(
            --grampsjs-alert-error-font-color
          );
          --md-outlined-button-outline-color: var(
            --grampsjs-alert-error-font-color
          );
        }

        .danger-zone p {
          margin: 0.4em 0;
        }

        .settings-text-field {
          width: 100%;
          max-width: 30em;
        }

        h3 {
          font-size: 1.1em;
          font-weight: 500;
          margin: 2em 0 0.5em;
        }

        h4 {
          font-size: 1em;
          font-weight: 500;
          margin: 1.5em 0 0.5em;
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

        .color-pickers {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5em;
          margin-bottom: 0.5em;
        }

        .color-row {
          display: flex;
          align-items: center;
          gap: 1em;
        }

        .color-label {
          font-size: 14px;
          min-width: 8em;
        }

        @media (max-width: 600px) {
          wa-color-picker {
            --grid-width: min(200px, 60vw);
            --grid-height: min(140px, 42vw);
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      _userInfo: {type: Object},
      _repairResults: {type: Object},
      _buttonUpdateSearchDisabled: {type: Boolean},
      _buttonUpdateSearchSemanticDisabled: {type: Boolean},
      _treeName: {type: String},
      _primaryColor: {type: String},
      _secondaryColor: {type: String},
      _importDialogOpen: {type: Boolean},
      _importFileReady: {type: Boolean},
      _homePageNoteGrampsId: {},
      _homePageImageGrampsId: {},
    }
  }

  constructor() {
    super()
    this._userInfo = {}
    this._repairResults = {}
    this._buttonUpdateSearchDisabled = false
    this._buttonUpdateSearchSemanticDisabled = false
    this._treeName = ''
    this._primaryColor = DEFAULT_PRIMARY
    this._secondaryColor = DEFAULT_SECONDARY
    this._importDialogOpen = false
    this._importFileReady = false
    this._homePageNoteGrampsId = null
    this._homePageImageGrampsId = null
  }

  renderContent() {
    return html`
      <p style="margin-top: 2.5em;">
        ${this._('Changes here affect all users of this tree.')}
      </p>

      <grampsjs-collapsible-section
        title="${this._('Data')}"
        description="${this._(
          'Quotas, imports, media, and storage management'
        )}"
      >
        <grampsjs-tree-quotas
          .appState="${this.appState}"
        ></grampsjs-tree-quotas>
        <grampsjs-import .appState="${this.appState}"></grampsjs-import>

        <grampsjs-media-status
          .appState="${this.appState}"
        ></grampsjs-media-status>
        ${this.appState.dbInfo?.object_counts?.media
          ? html`<grampsjs-media-file-status
              .appState="${this.appState}"
            ></grampsjs-media-file-status>`
          : ''}

        <grampsjs-import-media
          .appState="${this.appState}"
        ></grampsjs-import-media>
      </grampsjs-collapsible-section>

      <grampsjs-collapsible-section
        title="${this._('Search index')}"
        description="${this._('Manage and rebuild the search index')}"
      >
        <h3>${this._('Manage search index')}</h3>

        ${this._renderSearchStatus()}

        <p>
          ${this._(
            'Manually updating the search index is usually unnecessary, but it may become necessary after an upgrade.'
          )}
        </p>
        <md-outlined-button
          ?disabled=${this._buttonUpdateSearchDisabled}
          @click="${() => this._updateSearch(false)}"
          >${this._('Update search index')}</md-outlined-button
        >
        <grampsjs-task-progress-indicator
          class="button"
          id="progress-update-search"
          taskName="searchReindexFull"
          size="20"
          pollInterval="0.5"
          .appState="${this.appState}"
          @task:complete="${() => this._handleSuccessUpdateSearch(false)}"
        ></grampsjs-task-progress-indicator>

        ${this.appState.dbInfo?.server?.semantic_search
          ? html`
              <h3>${this._('Manage semantic search index')}</h3>

              ${this._renderSearchStatus(true)}

              <p>
                ${this._(
                  'Updating the semantic search index requires substantial time and computational resources. Run this operation only when necessary.'
                )}
              </p>
              <p>
                <md-outlined-button
                  ?disabled=${this._buttonUpdateSearchSemanticDisabled}
                  @click="${() => this._updateSearch(true)}"
                  >${this._(
                    'Regenerate semantic search index'
                  )}</md-outlined-button
                >
                <grampsjs-task-progress-indicator
                  class="button"
                  id="progress-update-search-semantic"
                  taskName="searchReindexFullSemantic"
                  size="20"
                  pollInterval="1.0"
                  .appState="${this.appState}"
                  @task:complete="${() =>
                    this._handleSuccessUpdateSearch(true)}"
                ></grampsjs-task-progress-indicator>
              </p>
              <p>
                <md-outlined-button
                  ?disabled=${this._buttonUpdateSearchSemanticDisabled}
                  @click="${() => this._updateSearch(true, true)}"
                  >${this._('Update semantic search index')}</md-outlined-button
                >
                <grampsjs-task-progress-indicator
                  class="button"
                  id="progress-update-search-semantic-incremental"
                  taskName="searchReindexIncrementalSemantic"
                  size="20"
                  pollInterval="1.0"
                  .appState="${this.appState}"
                  @task:complete="${() =>
                    this._handleSuccessUpdateSearch(true)}"
                ></grampsjs-task-progress-indicator>
              </p>
            `
          : ''}
      </grampsjs-collapsible-section>

      <grampsjs-collapsible-section
        title="${this._('Tree settings')}"
        description="${this._('Tree name and researcher information')}"
      >
        <h3>${this._('Family Tree name')}</h3>
        <p>
          <md-filled-text-field
            class="settings-text-field"
            id="tree-name-field"
            label="${this._('Family Tree name')}"
            .value="${this._treeName}"
            @input="${e => {
              this._treeName = e.target.value
            }}"
          ></md-filled-text-field>
        </p>
        <p>
          <md-outlined-button @click="${this._renameTree}"
            >${this._('_Rename')}</md-outlined-button
          >
        </p>

        <h3>${this._('Researcher Information')}</h3>
        <grampsjs-researcher .appState="${this.appState}"></grampsjs-researcher>
      </grampsjs-collapsible-section>

      <grampsjs-collapsible-section
        title="${this._('Customization')}"
        description="${this._('Colors, branding, and visual appearance')}"
      >
        <h3>${this._('Theme colors')}</h3>
        <div class="color-pickers">
          <div class="color-row">
            <span class="color-label">${this._('Primary color')}</span>
            <wa-color-picker
              format="hex"
              .value="${this._primaryColor}"
              @change="${e => {
                this._primaryColor = e.target.value
              }}"
            ></wa-color-picker>
          </div>
          <div class="color-row">
            <span class="color-label">${this._('Accent color')}</span>
            <wa-color-picker
              format="hex"
              .value="${this._secondaryColor}"
              @change="${e => {
                this._secondaryColor = e.target.value
              }}"
            ></wa-color-picker>
          </div>
        </div>
        <p style="display: flex; gap: 0.75em;">
          <md-outlined-button @click="${this._saveColors}"
            >${this._('_Save')}</md-outlined-button
          >
          <md-outlined-button @click="${this._resetColors}"
            >${this._('Reset')}</md-outlined-button
          >
        </p>

        <h3>${this._('App title')}</h3>
        <p>
          <md-filled-text-field
            class="settings-text-field"
            id="app-title-field"
            label="${this._('App title')}"
            .supportingText="${this._(
              'If set, overrides the family tree name in the title bar'
            )}"
            .value="${this.appState.treeConfig?.[TREE_CONFIG_APP_TITLE] ?? ''}"
          ></md-filled-text-field>
        </p>
        <p>
          <md-outlined-button @click="${this._saveAppTitle}"
            >${this._('_Save')}</md-outlined-button
          >
        </p>

        <h3>${this._('Home page note')}</h3>
        ${this.appState.treeConfig?.[TREE_CONFIG_HOME_PAGE_NOTE]
          ? html`
              <p style="display:flex; align-items:center; gap:0.75em;">
                ${this._homePageNoteGrampsId === null
                  ? html`<span class="skeleton" style="width:4em;"
                      >&nbsp;</span
                    >`
                  : html`<span>${this._homePageNoteGrampsId}</span>`}
                <md-outlined-button @click="${this._clearHomePageNote}"
                  >${this._('Remove')}</md-outlined-button
                >
              </p>
            `
          : ''}
        <p>
          <grampsjs-form-select-object
            objectType="note"
            .appState="${this.appState}"
            @select-object:changed="${this._handleHomePageNoteSelected}"
          ></grampsjs-form-select-object>
        </p>

        <h3>${this._('Home page image')}</h3>
        ${this.appState.treeConfig?.[TREE_CONFIG_HOME_PAGE_IMAGE]
          ? html`
              <p style="display:flex; align-items:center; gap:0.75em;">
                ${this._homePageImageGrampsId === null
                  ? html`<span class="skeleton" style="width:4em;"
                      >&nbsp;</span
                    >`
                  : html`<span>${this._homePageImageGrampsId}</span>`}
                <md-outlined-button @click="${this._clearHomePageImage}"
                  >${this._('Remove')}</md-outlined-button
                >
              </p>
            `
          : ''}
        <p>
          <grampsjs-form-select-object
            objectType="media"
            .appState="${this.appState}"
            @select-object:changed="${this._handleHomePageImageSelected}"
          ></grampsjs-form-select-object>
        </p>

        <h3>${this._('Export/Import settings')}</h3>
        <p style="display: flex; gap: 0.75em; flex-wrap: wrap;">
          <md-outlined-button @click="${this._handleExportTreeConfig}">
            <grampsjs-icon
              slot="icon"
              path="${mdiDownload}"
              color="var(--mdc-theme-primary)"
            ></grampsjs-icon>
            ${this._('Export')}
          </md-outlined-button>
          <md-outlined-button @click="${this._handleImportClick}">
            <grampsjs-icon
              slot="icon"
              path="${mdiUpload}"
              color="var(--mdc-theme-primary)"
            ></grampsjs-icon>
            ${this._('Import')}
          </md-outlined-button>
        </p>
        <a
          id="treeconfig-download"
          aria-hidden="true"
          href="#"
          style="display:none"
          download="grampsweb-tree-config.json"
        ></a>

        ${this._importDialogOpen
          ? html`
              <md-dialog open @cancel="${e => e.preventDefault()}">
                <span slot="headline">${this._('Import tree settings')}</span>
                <div slot="content">
                  <grampsjs-form-upload
                    id="treeconfig-upload"
                    accept=".json"
                    filename
                    .appState="${this.appState}"
                    @formdata:changed="${this._handleUploadChanged}"
                  ></grampsjs-form-upload>
                </div>
                <div slot="actions">
                  <md-text-button @click="${this._handleImportCancel}">
                    ${this._('Cancel')}
                  </md-text-button>
                  <md-filled-button
                    ?disabled="${!this._importFileReady}"
                    @click="${this._handleImportTreeConfig}"
                  >
                    ${this._('Import')}
                  </md-filled-button>
                </div>
              </md-dialog>
            `
          : ''}
      </grampsjs-collapsible-section>

      <grampsjs-collapsible-section
        title="${this._('Family Tree Processing')}"
        description="${this._(
          'Database checks, repairs, and other operations'
        )}"
      >
        <p>
          ${this._(
            'This tool checks the database for integrity problems, fixing the problems it can.'
          )}
        </p>
        <md-outlined-button @click="${this._checkRepair}"
          >${this._('Check and Repair')}</md-outlined-button
        >
        <grampsjs-task-progress-indicator
          class="button"
          id="progress-repair"
          taskName="repairDb"
          size="20"
          pollInterval="0.2"
          .appState="${this.appState}"
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
      </grampsjs-collapsible-section>

      <grampsjs-collapsible-section
        title="${this._('Danger Zone')}"
        description="${this._('Irreversible operations on tree data')}"
      >
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
              .appState="${this.appState}"
              @task:complete="${this._handleDeleteAllComplete}"
            ></grampsjs-task-progress-indicator>
            <md-outlined-button
              class="danger-button"
              @click="${this._openDeleteAll}"
            >
              <grampsjs-icon
                slot="icon"
                path="${mdiDeleteForever}"
                color="var(--grampsjs-alert-error-font-color)"
              ></grampsjs-icon>
              ${this._('Delete')}
            </md-outlined-button>
          </div>
        </div>
      </grampsjs-collapsible-section>

      <grampsjs-delete-all
        .appState="${this.appState}"
        @delete-objects="${this._handleDeleteAll}"
      ></grampsjs-delete-all>
      <grampsjs-relogin
        .appState="${this.appState}"
        @relogin="${this._openDeleteAll}"
        username="${this._userInfo?.name || ''}"
      ></grampsjs-relogin>
    `
  }

  _renderSearchStatus(semantic = false) {
    const property = semantic ? 'count_semantic' : 'count'
    const count = this.appState.dbInfo?.search?.sifts?.[property] ?? -1
    const objCounts = this.appState.dbInfo?.object_counts ?? {}
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
    if (this.appState.auth.isTokenFresh()) {
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
    const data = await this.appState.apiPost(url, null, {
      requireFresh: true,
      dbChanged: false,
    })
    if ('error' in data) {
      prog.setError()
      prog.errorMessage = data.error
    } else if ('task' in data) {
      prog.taskId = data.task?.id || ''
    } else {
      prog.setComplete()
    }
  }

  _handleDeleteAllComplete() {
    fireEvent(this, 'db:changed')
  }

  async _updateSearch(semantic = false, incremental = false) {
    let id
    if (semantic) {
      id = incremental
        ? 'progress-update-search-semantic-incremental'
        : 'progress-update-search-semantic'
    } else {
      id = 'progress-update-search'
    }
    const prog = this.renderRoot.querySelector(`#${id}`)
    prog.reset()
    prog.open = true
    const params = new URLSearchParams()
    if (!incremental) params.append('full', '1')
    if (semantic) params.append('semantic', '1')
    const url = `/api/search/index/?${params.toString()}`
    if (semantic) {
      this._buttonUpdateSearchSemanticDisabled = true
    } else {
      this._buttonUpdateSearchDisabled = true
    }
    const data = await this.appState.apiPost(url)
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
    const data = await this.appState.apiPost('/api/trees/-/repair', null, {
      dbChanged: false,
    })
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
    fireEvent(this, 'db:changed')
  }

  async _fetchTreeInfo() {
    const data = await this.appState.apiGet('/api/trees/-')
    if (!('error' in data)) {
      this._treeName = data?.data?.name ?? ''
    }
  }

  async _renameTree() {
    const data = await this.appState.apiPut('/api/trees/-', {
      name: this._treeName,
    })
    if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    }
  }

  async _saveColors() {
    const data = await this.appState.updateTreeConfig({
      [TREE_CONFIG_PRIMARY_COLOR]: this._primaryColor,
      [TREE_CONFIG_SECONDARY_COLOR]: this._secondaryColor,
    })
    if (data && 'error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    }
  }

  async _resetColors() {
    const data = await this.appState.updateTreeConfig({
      [TREE_CONFIG_PRIMARY_COLOR]: '',
      [TREE_CONFIG_SECONDARY_COLOR]: '',
    })
    if (data && 'error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    } else {
      this._primaryColor = DEFAULT_PRIMARY
      this._secondaryColor = DEFAULT_SECONDARY
    }
  }

  async _saveAppTitle() {
    const field = this.renderRoot.querySelector('#app-title-field')
    const data = await this.appState.updateTreeConfig({
      [TREE_CONFIG_APP_TITLE]: field.value,
    })
    if (data && 'error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    }
  }

  async _handleHomePageNoteSelected(e) {
    const obj = e.detail.objects?.[0]
    if (!obj) return
    this._homePageNoteGrampsId = null
    const data = await this.appState.updateTreeConfig({
      [TREE_CONFIG_HOME_PAGE_NOTE]: obj.handle,
    })
    if (data && 'error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    }
  }

  async _handleHomePageImageSelected(e) {
    const obj = e.detail.objects?.[0]
    if (!obj) return
    this._homePageImageGrampsId = null
    const data = await this.appState.updateTreeConfig({
      [TREE_CONFIG_HOME_PAGE_IMAGE]: obj.handle,
    })
    if (data && 'error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    }
  }

  async _clearHomePageNote() {
    const data = await this.appState.updateTreeConfig({
      [TREE_CONFIG_HOME_PAGE_NOTE]: '',
    })
    if (data && 'error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    }
  }

  async _clearHomePageImage() {
    const data = await this.appState.updateTreeConfig({
      [TREE_CONFIG_HOME_PAGE_IMAGE]: '',
    })
    if (data && 'error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    }
  }

  async _fetchHomePageGrampsIds() {
    const noteHandle = this.appState.treeConfig?.[TREE_CONFIG_HOME_PAGE_NOTE]
    const imageHandle = this.appState.treeConfig?.[TREE_CONFIG_HOME_PAGE_IMAGE]
    if (noteHandle) {
      const data = await this.appState.apiGet(
        `/api/notes/${noteHandle}?profile=self`
      )
      if (!('error' in data)) {
        this._homePageNoteGrampsId = data.data?.gramps_id || ''
      }
    }
    if (imageHandle) {
      const data = await this.appState.apiGet(
        `/api/media/${imageHandle}?profile=self`
      )
      if (!('error' in data)) {
        this._homePageImageGrampsId = data.data?.gramps_id || ''
      }
    }
  }

  _handleExportTreeConfig() {
    const blob = new Blob([JSON.stringify(this.appState.treeConfig, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = this.renderRoot.querySelector('#treeconfig-download')
    anchor.href = url
    anchor.click()
    URL.revokeObjectURL(url)
  }

  _handleImportClick() {
    this._importFileReady = false
    this._importDialogOpen = true
  }

  _handleImportCancel() {
    this._importDialogOpen = false
    this._importFileReady = false
  }

  _handleUploadChanged() {
    this._importFileReady = true
  }

  async _handleImportTreeConfig() {
    const uploadForm = this.renderRoot.querySelector('#treeconfig-upload')
    let data
    try {
      data = await uploadForm.readAsJson()
    } catch {
      fireEvent(this, 'grampsjs:error', {
        message: this._('Error parsing JSON file'),
      })
      return
    }
    if (
      typeof data !== 'object' ||
      Array.isArray(data) ||
      data === null ||
      Object.keys(data).length === 0
    ) {
      fireEvent(this, 'grampsjs:error', {
        message: this._('Error parsing JSON file'),
      })
      return
    }
    const res = await this.appState.replaceTreeConfig(data)
    if (res?.error) {
      fireEvent(this, 'grampsjs:error', {message: res.error})
    } else {
      this._importDialogOpen = false
      fireEvent(this, 'grampsjs:notification', {
        message: this._('Settings successfully imported'),
      })
    }
  }

  async _fetchOwnUserDetails() {
    const data = await this.appState.apiGet('/api/users/-/')
    if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    } else {
      this.error = false
      this._userInfo = data.data
    }
  }

  updated(changed) {
    super.updated(changed)
    if (changed.has('appState')) {
      const prev = changed.get('appState')
      if (
        prev?.treeConfig?.[TREE_CONFIG_PRIMARY_COLOR] !==
          this.appState.treeConfig?.[TREE_CONFIG_PRIMARY_COLOR] ||
        prev?.treeConfig?.[TREE_CONFIG_SECONDARY_COLOR] !==
          this.appState.treeConfig?.[TREE_CONFIG_SECONDARY_COLOR]
      ) {
        this._primaryColor =
          this.appState.treeConfig?.[TREE_CONFIG_PRIMARY_COLOR] ||
          DEFAULT_PRIMARY
        this._secondaryColor =
          this.appState.treeConfig?.[TREE_CONFIG_SECONDARY_COLOR] ||
          DEFAULT_SECONDARY
      }
      if (
        prev?.treeConfig?.[TREE_CONFIG_HOME_PAGE_NOTE] !==
          this.appState.treeConfig?.[TREE_CONFIG_HOME_PAGE_NOTE] ||
        prev?.treeConfig?.[TREE_CONFIG_HOME_PAGE_IMAGE] !==
          this.appState.treeConfig?.[TREE_CONFIG_HOME_PAGE_IMAGE]
      ) {
        this._fetchHomePageGrampsIds()
      }
    }
  }

  firstUpdated() {
    super.firstUpdated()
    this._fetchOwnUserDetails()
    this._fetchTreeInfo()
    this._fetchHomePageGrampsIds()
  }
}

window.customElements.define(
  'grampsjs-view-admin-settings',
  GrampsjsViewAdminSettings
)
