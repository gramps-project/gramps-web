import {html, css} from 'lit'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'
import '@material/web/divider/divider.js'
import '@material/web/button/outlined-button.js'
import '@material/web/button/text-button.js'
import '@material/web/dialog/dialog.js'
import '@material/web/iconbutton/icon-button.js'
import {
  mdiAlertCircleOutline,
  mdiInformationOutline,
  mdiAlertOutline,
  mdiDeleteSweep,
  mdiChevronRight,
  mdiContentCopy,
} from '@mdi/js'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsTimedelta.js'
import '../components/GrampsjsTaskProgressIndicator.js'

const TYPE_ICON = {
  error: mdiAlertCircleOutline,
  warning: mdiAlertOutline,
  info: mdiInformationOutline,
}

const TYPE_COLOR = {
  error: 'var(--md-sys-color-error)',
  warning: 'var(--md-sys-color-tertiary)',
  info: 'var(--md-sys-color-primary)',
}

export class GrampsjsViewNotificationLog extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5em;
          margin-bottom: 1.5em;
        }

        h2 {
          margin: 0;
        }

        md-list {
          --md-list-item-label-text-size: 0.95em;
          --md-list-item-supporting-text-color: var(
            --grampsjs-body-font-color-60
          );
          max-width: 600px;
          padding: 0;
        }

        .empty-state {
          color: var(--grampsjs-body-font-color-60);
        }

        md-list-item[type='button'] {
          cursor: pointer;
        }

        dl {
          display: grid;
          grid-template-columns: max-content 1fr;
          gap: 4px 16px;
          margin: 0;
          font-size: 0.9em;
        }

        dt {
          color: var(--grampsjs-body-font-color-60);
          font-weight: 500;
        }

        dd {
          margin: 0;
          word-break: break-all;
        }

        .dialog-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .active-tasks {
          max-width: 600px;
          margin-bottom: 2em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _notifications: {type: Array},
      _selectedNotification: {type: Object},
      _activeTasks: {type: Array},
    }
  }

  constructor() {
    super()
    this._notifications = []
    this._selectedNotification = null
    this._activeTasks = []
    this._boundHandleNotifications = this._handleNotificationsChanged.bind(this)
    this._boundHandleTasksChanged = this._handleTasksChanged.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    this._notifications = this.appState?.getNotifications?.() ?? []
    this._activeTasks = this.appState?.getActiveTasks?.() ?? []
    window.addEventListener(
      'notifications:changed',
      this._boundHandleNotifications
    )
    window.addEventListener('tasks:changed', this._boundHandleTasksChanged)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener(
      'notifications:changed',
      this._boundHandleNotifications
    )
    window.removeEventListener('tasks:changed', this._boundHandleTasksChanged)
  }

  _handleNotificationsChanged(e) {
    this._notifications = [...e.detail.notifications]
  }

  _handleTasksChanged(e) {
    this._activeTasks = [...e.detail.tasks]
  }

  updated(changed) {
    super.updated(changed)
    if (changed.has('active') && this.active) {
      this.appState?.markAllRead()
      // Refresh from server so cross-device / post-reload tasks are visible.
      this.appState?.loadActiveTasks?.()
    }
  }

  renderContent() {
    return html`
      <div class="header">
        <h2>${this._('Notifications')}</h2>
        <md-outlined-button
          ?disabled="${this._notifications.length === 0}"
          @click="${() => this.appState?.clearNotifications()}"
        >
          <grampsjs-icon
            slot="icon"
            path="${mdiDeleteSweep}"
            color="var(--md-outlined-button-label-text-color, var(--md-sys-color-primary))"
            height="20"
            width="20"
          ></grampsjs-icon>
          ${this._('Clear _All')}
        </md-outlined-button>
      </div>

      ${this._activeTasks.length > 0
        ? html`
            <div class="active-tasks">
              <h3>${this._('Running tasks')}</h3>
              <md-list>
                ${this._activeTasks.map(
                  task => html`
                    <md-list-item type="text" noninteractive>
                      <grampsjs-task-progress-indicator
                        slot="start"
                        taskId="${task.id}"
                        taskName="${task.taskName}"
                        size="24"
                        hideAfter="0"
                        ?open="${true}"
                        .appState="${this.appState}"
                      ></grampsjs-task-progress-indicator>
                      <div slot="headline">${this._(task.label)}</div>
                      <div slot="supporting-text">
                        <grampsjs-timedelta
                          timestamp="${task.createdAt}"
                          locale="${this.appState?.i18n?.lang || 'en'}"
                        ></grampsjs-timedelta>
                        ${task.userName ? html` &middot; ${task.userName}` : ''}
                      </div>
                    </md-list-item>
                    <md-divider></md-divider>
                  `
                )}
              </md-list>
            </div>
          `
        : ''}
      ${this._notifications.length === 0 && this._activeTasks.length === 0
        ? html`<p class="empty-state">${this._('None')}.</p>`
        : this._notifications.length === 0
        ? ''
        : html`
            ${this._activeTasks.length > 0
              ? html`<h3>${this._('Notifications')}</h3>`
              : ''}
            <md-list>
              ${this._notifications.map(
                n => html`
                  <md-list-item
                    type="${this._hasDetail(n) ? 'button' : 'text'}"
                    ?noninteractive="${!this._hasDetail(n)}"
                    @click="${() => this._hasDetail(n) && this._openDetail(n)}"
                  >
                    <grampsjs-icon
                      slot="start"
                      path="${TYPE_ICON[n.type] ?? TYPE_ICON.info}"
                      color="${TYPE_COLOR[n.type] ?? TYPE_COLOR.info}"
                      height="20"
                      width="20"
                    ></grampsjs-icon>
                    <div slot="headline">
                      ${n.source === 'task' ? this._(n.message) : n.message}
                    </div>
                    <div slot="supporting-text">
                      ${this._sourceLabel(n.source)} &middot;
                      <grampsjs-timedelta
                        timestamp="${n.timestamp.getTime() / 1000}"
                        locale="${this.appState?.i18n?.lang || 'en'}"
                      ></grampsjs-timedelta>
                      ${n.userName ? html` &middot; ${n.userName}` : ''}
                    </div>
                    ${this._hasDetail(n)
                      ? html`<grampsjs-icon
                          slot="end"
                          path="${mdiChevronRight}"
                          color="var(--grampsjs-body-font-color-60)"
                          height="20"
                          width="20"
                        ></grampsjs-icon>`
                      : ''}
                  </md-list-item>
                  <md-divider></md-divider>
                `
              )}
            </md-list>
          `}
      ${this._selectedNotification
        ? html`
            <md-dialog open @cancel="${e => e.preventDefault()}">
              <div slot="headline">${this._selectedNotification.message}</div>
              <div slot="content">
                <dl>
                  ${Object.entries(this._selectedNotification.detail).map(
                    ([k, v]) => html`
                      <dt>${k}</dt>
                      <dd>${typeof v === 'object' ? JSON.stringify(v) : v}</dd>
                    `
                  )}
                </dl>
              </div>
              <div slot="actions">
                <div class="dialog-actions">
                  <md-icon-button
                    title="${this._('Copy JSON')}"
                    aria-label="${this._('Copy JSON')}"
                    @click="${() =>
                      this._copyDetail(this._selectedNotification.detail)}"
                  >
                    <grampsjs-icon
                      path="${mdiContentCopy}"
                      height="20"
                      width="20"
                    ></grampsjs-icon>
                  </md-icon-button>
                  <md-text-button
                    @click="${() => {
                      this._selectedNotification = null
                    }}"
                  >
                    ${this._('Close')}
                  </md-text-button>
                </div>
              </div>
            </md-dialog>
          `
        : ''}
    `
  }

  async _copyDetail(detail) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(detail, null, 2))
    } catch (err) {
      this.dispatchEvent(
        new CustomEvent('grampsjs:error', {
          bubbles: true,
          composed: true,
          detail: {
            message: this._('Failed to copy to clipboard'),
            source: 'browser',
            detail: {error: err?.message ?? String(err)},
          },
        })
      )
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _hasDetail(n) {
    return n.detail && Object.keys(n.detail).length > 0
  }

  _openDetail(n) {
    this._selectedNotification = n
  }

  _sourceLabel(source) {
    const labels = {
      api: this._('Network'),
      task: this._('Task'),
      save: this._('_Save'),
      browser: this._('Browser'),
    }
    return labels[source] ?? source
  }
}

window.customElements.define(
  'grampsjs-view-notification-log',
  GrampsjsViewNotificationLog
)
