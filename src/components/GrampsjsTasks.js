/*
The list of tasks with its filters and bulk actions
*/

import {html, css, LitElement, nothing} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/web/checkbox/checkbox'
import '@material/web/button/filled-button'
import '@material/web/button/outlined-button'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'

import {
  mdiRadioboxBlank,
  mdiTimelapse,
  mdiMinusCircle,
  mdiCheckCircle,
  mdiCheckboxMultipleOutline,
  mdiHelp,
  mdiChevronDoubleDown,
  mdiAdjust,
  mdiChevronDoubleUp,
} from '@mdi/js'

import './GrampsjsFilters.js'
import './GrampsjsTagsSmall.js'
import './GrampsjsIcon.js'
import './GrampsjsTooltip.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {clickKeyHandler, fireEvent} from '../util.js'
import {tagFilter} from '../filterDefinitions.js'
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  priorityLabel,
  taskAttribute,
} from '../taskConstants.js'

const STATUS_ICONS = {
  Open: {path: mdiRadioboxBlank, color: 'var(--grampsjs-task-open)'},
  'In Progress': {path: mdiTimelapse, color: 'var(--grampsjs-task-progress)'},
  Blocked: {
    path: mdiMinusCircle,
    color: 'var(--grampsjs-alert-error-font-color)',
  },
  Done: {path: mdiCheckCircle, color: 'var(--grampsjs-task-done)'},
}

const PRIORITY_ICONS = {
  High: {
    path: mdiChevronDoubleUp,
    color: 'var(--grampsjs-alert-error-font-color)',
  },
  Medium: {path: mdiAdjust},
  Low: {
    path: mdiChevronDoubleDown,
    color: 'var(--grampsjs-alert-success-font-color)',
  },
}

class GrampsjsTasks extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .tasks-list {
          font-size: 15px;
          margin-top: 20px;
          margin-bottom: 85px;
        }

        .task-item {
          border-top: 1px solid var(--grampsjs-body-font-color-10);
          display: flex;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
          padding-left: 10px;
          gap: 8px;
        }

        .task-item:last-child {
          border-bottom: 1px solid var(--grampsjs-body-font-color-10);
        }

        .task-item.selectable,
        .task-item.clickable {
          cursor: pointer;
        }

        .task-item.selectable:hover,
        .task-item.clickable:hover {
          background-color: var(--grampsjs-color-shade-240);
        }

        .task-item.selectable:focus-visible {
          outline: 2px solid var(--mdc-theme-primary);
          outline-offset: -2px;
        }

        .task-item.selected {
          background-color: var(
            --md-sys-color-secondary-container,
            var(--grampsjs-color-shade-240)
          );
        }

        .task-item md-checkbox {
          flex-shrink: 0;
          pointer-events: none;
        }

        a.title-link {
          color: var(--mdc-theme-text-primary-on-background);
        }

        .task-item.clickable:hover a.title-link,
        a.title-link:focus-visible {
          color: var(--grampsjs-color-link-hover);
          text-decoration: none;
        }

        .item-content {
          padding: 14px 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
        }

        .status-icon {
          width: 32px;
          display: flex;
          align-items: center;
        }

        .status-icon grampsjs-icon {
          margin-right: 12px;
        }

        .title {
          white-space: normal;
          overflow-wrap: break-word;
          height: 100%;
          width: 100%;
          padding-right: 8px;
          flex: auto;
          word-wrap: break-word;
          hyphens: auto;
        }

        .strike {
          text-decoration: line-through !important;
        }

        .batch-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px 24px;
          padding: 6px 4px;
          margin-top: 8px;
        }

        .batch-toolbar .selection-count {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          color: var(--grampsjs-body-font-color-70);
        }

        .batch-actions {
          display: flex;
          gap: 8px;
        }

        .menu-anchor {
          position: relative;
          display: inline-block;
        }

        md-checkbox {
          --md-sys-color-primary: var(--md-sys-color-secondary);
          --md-sys-color-on-primary: var(--md-sys-color-on-secondary);
        }

        .prio-icon grampsjs-icon {
          padding-left: 8px;
          position: relative;
          top: 2px;
        }

        grampsjs-tags-small {
          margin-left: 1em;
        }

        .task-meta {
          padding-right: 8px;
        }

        .empty {
          margin-top: 32px;
          color: var(--grampsjs-body-font-color-60);
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      loading: {type: Boolean},
      _selectionMode: {type: Boolean},
      _selectedHandles: {type: Array},
    }
  }

  constructor() {
    super()
    this.data = []
    this.loading = false
    this._selectionMode = false
    this._selectedHandles = []
  }

  get _canEdit() {
    return this.appState?.permissions?.canEdit
  }

  // Selected tasks that are no longer listed, e.g. after a filter change or
  // a reload, are deselected
  willUpdate(changed) {
    if (!this._canEdit) {
      this._selectionMode = false
    }
    if (!this._selectionMode) {
      if (this._selectedHandles.length > 0) {
        this._selectedHandles = []
      }
      return
    }
    if (changed.has('data')) {
      const handles = this.data.map(task => task.handle)
      const selected = this._selectedHandles.filter(handle =>
        handles.includes(handle)
      )
      if (selected.length !== this._selectedHandles.length) {
        this._selectedHandles = selected
      }
    }
  }

  render() {
    return html`
      <grampsjs-filters
        .appState="${this.appState}"
        .definitions="${[tagFilter(s => this._(s))]}"
        namespace="sources"
      >
        ${this._canEdit ? this._renderSelectButton() : ''}
      </grampsjs-filters>
      ${this._selectionMode ? this._renderBatchToolbar() : ''}
      ${this.data.length === 0 && !this.loading
        ? html`<p class="empty">${this._('None')}</p>`
        : html`<div class="tasks-list">
            ${this.data.map(task => this._renderTask(task))}
          </div>`}
    `
  }

  _renderSelectButton() {
    const icon = html`<grampsjs-icon
      slot="icon"
      .path="${mdiCheckboxMultipleOutline}"
      height="20"
      color="currentColor"
    ></grampsjs-icon>`
    return this._selectionMode
      ? html`<md-filled-button
          slot="leading"
          @click="${this._toggleSelectionMode}"
        >
          ${icon} ${this._('Select')}
        </md-filled-button>`
      : html`<md-outlined-button
          slot="leading"
          @click="${this._toggleSelectionMode}"
        >
          ${icon} ${this._('Select')}
        </md-outlined-button>`
  }

  _renderBatchToolbar() {
    const count = this._selectedHandles.length
    return html`
      <div class="batch-toolbar">
        <span class="selection-count">
          <md-checkbox
            ?checked="${count > 0 && count === this.data.length}"
            ?indeterminate="${count > 0 && count < this.data.length}"
            aria-label="${this._('_Select All')}"
            @change="${this._handleSelectAll}"
          ></md-checkbox>
          <span>${this._('%s selected', count)}</span>
        </span>
        <div class="batch-actions">
          ${this._renderActionMenu(
            'prio',
            this._('Set Priority'),
            TASK_PRIORITIES,
            'Priority'
          )}
          ${this._renderActionMenu(
            'status',
            this._('Set Status'),
            TASK_STATUSES.map(status => ({label: status, value: status})),
            'Status'
          )}
        </div>
      </div>
    `
  }

  _renderActionMenu(id, label, items, attribute) {
    return html`
      <div class="menu-anchor">
        <md-outlined-button
          id="${id}-btn"
          ?disabled="${this._selectedHandles.length === 0}"
          @click="${() => {
            this.renderRoot.getElementById(`${id}-menu`).open = true
          }}"
          >${label}</md-outlined-button
        >
        <md-menu id="${id}-menu" anchor="${id}-btn">
          ${items.map(
            item => html`
              <md-menu-item
                @click="${() => this._updateAttribute(attribute, item.value)}"
              >
                <div slot="headline">${this._(item.label)}</div>
              </md-menu-item>
            `
          )}
        </md-menu>
      </div>
    `
  }

  _renderTask(task) {
    const status = taskAttribute(task, 'Status')
    const selected = this._selectedHandles.includes(task.handle)
    const content = html`
      <div class="item-content">
        <div class="status-icon">${this._statusIcon(status, task.handle)}</div>
        <div class="title">
          ${this._selectionMode
            ? html`<span class="${classMap({strike: status === 'Done'})}"
                >${task.title}</span
              >`
            : html`<a
                class="${classMap({
                  'title-link': true,
                  strike: status === 'Done',
                })}"
                href="/task/${task.gramps_id}"
                >${task.title}</a
              >`}
          <grampsjs-tags-small
            .data="${task.extended.tags.filter(tag => tag.name !== 'ToDo')}"
          ></grampsjs-tags-small>
        </div>
      </div>
      <div class="task-meta">
        <span class="prio-icon"
          >${this._priorityIcon(
            taskAttribute(task, 'Priority'),
            task.handle
          )}</span
        >
      </div>
    `
    if (!this._selectionMode) {
      // the title link is the keyboard target, so the row needs no key handler
      // eslint-disable-next-line lit-a11y/click-events-have-key-events
      return html`<div
        class="task-item clickable"
        @click="${e => this._handleRowClick(e, task)}"
      >
        ${content}
      </div>`
    }
    return html`
      <div
        class="${classMap({'task-item': true, selectable: true, selected})}"
        role="checkbox"
        aria-checked="${String(selected)}"
        tabindex="0"
        @click="${() => this._toggleSelected(task.handle)}"
        @keydown="${clickKeyHandler}"
      >
        <md-checkbox
          ?checked="${selected}"
          tabindex="-1"
          aria-hidden="true"
        ></md-checkbox>
        ${content}
      </div>
    `
  }

  _statusIcon(status, handle) {
    const id = `status-icon-${handle}`
    const icon = STATUS_ICONS[status] ?? {path: mdiHelp}
    return html`
      <grampsjs-icon
        path="${icon.path}"
        color="${icon.color ?? nothing}"
        id="${id}"
        height="20"
        width="20"
      ></grampsjs-icon>
      <grampsjs-tooltip for="${id}" .appState="${this.appState}"
        >${this._(status ?? '')}</grampsjs-tooltip
      >
    `
  }

  _priorityIcon(priority, handle) {
    const label = priorityLabel(priority)
    if (!label) {
      return ''
    }
    const id = `priority-icon-${handle}`
    const icon = PRIORITY_ICONS[label]
    return html`
      <span class="priority-label">
        <grampsjs-icon
          path="${icon.path}"
          color="${icon.color ?? nothing}"
          id="${id}"
          height="20"
          width="20"
        ></grampsjs-icon>
        <grampsjs-tooltip for="${id}" .appState="${this.appState}"
          >${this._('Priority')}: ${this._(label)}</grampsjs-tooltip
        >
      </span>
    `
  }

  // clicks on the title link are left to the link
  _handleRowClick(e, task) {
    const path = e.composedPath()
    const inRow = path.slice(0, path.indexOf(e.currentTarget))
    if (inRow.some(node => node.tagName === 'A')) {
      return
    }
    fireEvent(this, 'nav', {path: `task/${task.gramps_id}`})
  }

  _toggleSelectionMode() {
    this._selectionMode = !this._selectionMode
  }

  _toggleSelected(handle) {
    this._selectedHandles = this._selectedHandles.includes(handle)
      ? this._selectedHandles.filter(h => h !== handle)
      : [...this._selectedHandles, handle]
  }

  _handleSelectAll() {
    this._selectedHandles =
      this._selectedHandles.length === this.data.length
        ? []
        : this.data.map(task => task.handle)
  }

  _updateAttribute(key, value) {
    const objects = this.data.filter(task =>
      this._selectedHandles.includes(task.handle)
    )
    fireEvent(this, 'tasks:update-attribute', {objects, key, value})
  }
}

window.customElements.define('grampsjs-tasks', GrampsjsTasks)
