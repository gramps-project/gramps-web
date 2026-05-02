import {css, html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/web/list/list'
import '@material/web/list/list-item'
import '@material/web/button/filled-button'
import '@material/web/button/text-button'
import '@material/web/dialog/dialog.js'

import '../components/GrampsjsTimedelta.js'
import '../components/GrampsjsSearchResultList.js'
import '../components/GrampsjsDiffJson.js'
import '../components/GrampsjsBreadcrumbs.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsTaskProgressIndicator.js'

import {mdiClose, mdiUndo, mdiAlertOutline} from '@mdi/js'
import {GrampsjsView} from './GrampsjsView.js'

import {renderIconSvg} from '../icons.js'
import {fireEvent} from '../util.js'

export class GrampsjsViewRevision extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        md-list-item {
          --md-list-item-label-text-weight: 350;
          --md-list-item-label-text-size: 17px;
          --md-list-item-supporting-text-color: var(
            --grampsjs-body-font-color-50
          );
          --md-list-item-trailing-supporting-text-color: var(
            --grampsjs-body-font-color
          );
        }

        svg[slot='end'] {
          height: 22px;
          width: 22px;
          opacity: 0.9;
        }

        md-divider {
          --md-divider-thickness: 1px;
          --md-divider-color: var(--grampsjs-body-font-color-10);
        }

        #left {
        }

        .hidden {
          display: none;
        }

        #clear {
          clear: left;
        }

        #close-button {
          text-align: right;
          margin-bottom: 15px;
        }

        @media (min-width: 1200px) {
          .hidden {
            display: block;
          }

          #left {
            width: calc(50% - 20px);
            margin-right: 40px;
            margin-left: 0px;
            float: left;
          }

          #right {
            width: calc(50% - 20px);
            margin: 0;
            float: left;
            margin-top: 0px;
          }
        }

        p.user-time {
          font-size: 0.95em;
          color: var(--grampsjs-body-font-color-60);
        }

        span.user {
          font-weight: 440;
        }

        .revision-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5em;
        }

        .revision-header h2 {
          margin-top: 0;
        }

        .undo-button {
          margin-top: 0.2em;
          flex-shrink: 0;
          --md-filled-button-hover-container-elevation: 0;
        }

        .dialog-warning {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 8px 0;
        }

        .dialog-warning svg {
          flex-shrink: 0;
          margin-top: 2px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      transactionId: {type: Number},
      _data: {type: Object},
      _detailId: {type: Number},
      _undoDialogOpen: {type: Boolean},
      _forceRequired: {type: Boolean},
      _undoInProgress: {type: Boolean},
      _undoTaskRunning: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.transactionId = -1
    this._data = {}
    this._detailId = -1
    this._undoDialogOpen = false
    this._forceRequired = false
    this._undoInProgress = false
    this._undoTaskRunning = false
  }

  _getDescription() {
    if (this._data.description) return this._(this._data.description)
    const changes = (this._data.changes ?? []).filter(c => c.obj_class !== '7')
    for (const transType of [0, 1, 2]) {
      const change = changes.find(c => c.trans_type === transType)
      if (change) {
        const prefix =
          transType === 0 ? 'New' : transType === 1 ? 'Edit' : 'Delete'
        return this._(`${prefix} ${change.obj_class}`)
      }
    }
    return ''
  }

  _getChanges(transType) {
    return (
      this._data.changes?.filter(
        change => change.trans_type === transType && change.obj_class !== '7'
      ) ?? []
    )
  }

  render() {
    if (!this._data.id) {
      return ''
    }
    return html`
      <grampsjs-breadcrumbs
        hideLock
        hideBookmark
        .data="${{gramps_id: this.transactionId}}"
        .appState="${this.appState}"
        objectsName="Revisions"
        objectIcon="commit"
      ></grampsjs-breadcrumbs>

      <div class="revision-header">
        <h2>${this._getDescription()}</h2>
        ${this.appState.permissions.canEdit
          ? html`
              <md-filled-button
                class="undo-button"
                @click="${this._handleUndoClick}"
                ?disabled="${this._undoInProgress}"
              >
                <grampsjs-icon
                  slot="icon"
                  path="${mdiUndo}"
                  color="var(--md-filled-button-label-text-color, var(--mdc-theme-on-primary))"
                ></grampsjs-icon>
                ${this._('Undo')}
              </md-filled-button>
            `
          : ''}
      </div>

      <p class="user-time">
        <span class="user">
          ${this._data.connection?.user
            ? this._renderUser(this._data.connection?.user)
            : this._('Unknown')},
        </span>
        <span class="time">
          <grampsjs-timedelta
            timestamp="${this._data.timestamp}"
            locale="${this.appState.i18n.lang}"
          ></grampsjs-timedelta>
        </span>
      </p>

      ${this._renderUndoDialog()}

      <div id="left" class="${classMap({hidden: this._detailId > 0})}">
        ${this._getChanges(0).length > 0
          ? html`<h3>${this._('Added')}</h3>
              ${this._renderAdded()}`
          : ''}
        ${this._getChanges(2).length > 0
          ? html`
              <h3>${this._('Deleted')}</h3>
              ${this._renderDeleted()}
            `
          : ''}
        ${this._getChanges(1).length > 0
          ? html`<h3>${this._('Edited')}</h3>
              ${this._renderEdited()} `
          : ''}
      </div>
      <div id="right">${this._renderDetail()}</div>
      <div id="clear"></div>
    `
  }

  _renderDetail() {
    if (this._detailId < 0) {
      return ''
    }
    const change = this._data.changes?.[this._detailId]
    return html`
      <div id="close-button">
        <md-text-button @click="${this._handleCloseDetail}"
          >${renderIconSvg(mdiClose, '--md-sys-color-primary', 0, 'icon')}
          ${this._('Close')}</md-text-button
        >
      </div>
      <grampsjs-diff-json
        .left="${change.old_data}"
        .right="${change.new_data}"
        .appState="${this.appState}"
      ></grampsjs-diff-json>
    `
  }

  _handleCloseDetail() {
    this._detailId = -1
  }

  _renderUndoDialog() {
    if (!this._undoDialogOpen) {
      return ''
    }
    return html`
      <md-dialog
        open
        @cancel="${() => {
          this._undoDialogOpen = false
        }}"
        @closed="${() => {
          this._undoDialogOpen = false
          this._undoTaskRunning = false
        }}"
      >
        <div slot="headline">
          ${this._forceRequired
            ? this._('Undo revision (force)')
            : this._('Undo revision')}
        </div>
        <div slot="content">
          ${this._forceRequired
            ? html`
                <div class="dialog-warning">
                  ${renderIconSvg(
                    mdiAlertOutline,
                    'var(--md-sys-color-error)',
                    0
                  )}
                  <span>
                    ${this._(
                      'This revision cannot be cleanly undone because some objects have been modified after this transaction. Forcing the undo may result in data inconsistencies.'
                    )}
                  </span>
                </div>
              `
            : this._('This will revert all changes made in this revision.')}
        </div>
        <div slot="actions">
          ${this._undoTaskRunning
            ? html`<grampsjs-task-progress-indicator
                id="progress-undo"
                taskName="undoTransaction"
                size="32"
                pollInterval="0.2"
                .appState="${this.appState}"
                @task:complete="${this._handleUndoComplete}"
              ></grampsjs-task-progress-indicator>`
            : html`
                <md-text-button
                  @click="${() => {
                    this._undoDialogOpen = false
                  }}"
                >
                  ${this._('Cancel')}
                </md-text-button>
                ${this._forceRequired
                  ? html`
                      <md-filled-button
                        style="--md-filled-button-container-color: var(--md-sys-color-error); --md-filled-button-label-text-color: var(--md-sys-color-on-error); --md-filled-button-hover-container-elevation: 0;"
                        @click="${() => this._handleUndoConfirm(true)}"
                        ?disabled="${this._undoInProgress}"
                      >
                        ${this._('Force undo')}
                      </md-filled-button>
                    `
                  : html`
                      <md-filled-button
                        @click="${() => this._handleUndoConfirm(false)}"
                        ?disabled="${this._undoInProgress}"
                      >
                        ${this._('Undo')}
                      </md-filled-button>
                    `}
              `}
        </div>
      </md-dialog>
    `
  }

  async _handleUndoClick() {
    this._undoInProgress = true
    const result = await this.appState.apiGet(
      `/api/transactions/history/${this.transactionId}/undo`
    )
    this._undoInProgress = false
    if ('error' in result) {
      fireEvent(this, 'grampsjs:error', {message: result.error})
      return
    }
    this._forceRequired = result.data?.can_undo_without_force === false
    this._undoDialogOpen = true
  }

  async _handleUndoConfirm(force = false) {
    this._undoTaskRunning = true
    const endpoint = `/api/transactions/history/${this.transactionId}/undo${
      force ? '?force=1' : ''
    }`
    const result = await this.appState.apiPost(endpoint, null, {
      saving: false,
      dbChanged: false,
    })
    if ('error' in result) {
      this._undoTaskRunning = false
      this._undoDialogOpen = false
      fireEvent(this, 'grampsjs:error', {message: result.error})
    } else if ('task' in result) {
      await this.updateComplete
      const prog = this.renderRoot.querySelector('#progress-undo')
      prog.open = true
      prog.taskId = result.task?.id || ''
    } else {
      this._handleUndoComplete()
    }
  }

  _handleUndoComplete() {
    this._undoTaskRunning = false
    this._undoDialogOpen = false
    fireEvent(this, 'db:changed')
    fireEvent(this, 'nav', {path: 'revisions'})
  }

  _renderAdded() {
    return html`<grampsjs-search-result-list
      @search-result:clicked=${this._handleEditedClicked}
      selectable
      .data="${this._getChanges(0).map(change => ({
        object_type: change.obj_class?.toLowerCase(),
        object: change.new_data,
      }))}"
      .appState="${this.appState}"
    >
    </grampsjs-search-result-list> `
  }

  _renderDeleted() {
    return html`
      <grampsjs-search-result-list
        @search-result:clicked=${this._handleEditedClicked}
        selectable
        .data="${this._getChanges(2).map(change => ({
          object_type: change.obj_class?.toLowerCase(),
          object: change.old_data,
        }))}"
        .appState="${this.appState}"
      >
      </grampsjs-search-result-list>
    `
  }

  _renderEdited() {
    return html`
      <grampsjs-search-result-list
        @search-result:clicked=${this._handleEditedClicked}
        selectable
        .data="${this._getChanges(1).map(change => ({
          object_type: change.obj_class?.toLowerCase(),
          object: change.old_data,
        }))}"
        .appState="${this.appState}"
      >
      </grampsjs-search-result-list>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderUser(user) {
    return user.full_name || user.name
  }

  _handleEditedClicked(e) {
    const obj = e.detail
    const index = this._data.changes.findIndex(
      change =>
        change.obj_class.toLowerCase() === obj.object_type &&
        change.obj_handle === obj.object.handle
    )
    this._detailId = index
  }

  async _fetchData() {
    this.loading = true
    const data = await this.appState.apiGet(
      `/api/transactions/history/${this.transactionId}?old=1&new=1`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._data = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  firstUpdated() {
    this._fetchData()
  }

  update(changed) {
    super.update(changed)
    if (this.active && changed.has('transactionId')) {
      this._data = []
      this._detailId = -1
      this._fetchData()
    }
    if (
      changed.has('active') &&
      this.active &&
      (Object.keys(this._data).length === 0 ||
        this._data.id !== this.transactionId) &&
      !this.loading
    ) {
      this._data = []
      this._detailId = -1
      this._fetchData()
    }
  }
}

window.customElements.define('grampsjs-view-revision', GrampsjsViewRevision)
