/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/web/checkbox/checkbox'
import '@material/web/button/outlined-button'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'

import {
  mdiRadioboxBlank,
  mdiTimelapse,
  mdiMinusCircle,
  mdiCheckCircle,
  mdiHelp,
  mdiChevronDoubleDown,
  mdiAdjust,
  mdiChevronDoubleUp,
} from '@mdi/js'

import './GrampsjsFilters.js'
import './GrampsjsFilterTags.js'
import './GrampsjsTagsSmall.js'
import './GrampsjsIcon.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {clickKeyHandler, fireEvent} from '../util.js'

class GrampsjsTasks extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .tasks-list {
          font-size: 15px;
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

        h4 {
          font-family: var(--grampsjs-body-font-family);
          font-size: 14px;
          font-weight: 450;
          color: var(--grampsjs-body-font-color-70);
          text-transform: uppercase;
        }

        span.link {
          color: var(--mdc-theme-text-primary-on-background);
          padding: 0;
        }

        span.link:hover {
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

        .tags {
          flex: auto;
          white-space: normal;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }

        md-checkbox#select-all {
          margin-right: 16px;
        }

        .filters {
          margin-bottom: 32px;
        }

        .taskbar {
          padding-left: 10px;
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }

        .status-icon grampsjs-icon {
          margin-right: 12px;
        }

        .success {
          color: var(--grampsjs-alert-success-font-color);
        }

        .done {
          color: var(--grampsjs-task-done);
        }

        .progress {
          color: var(--grampsjs-task-progress);
        }

        .open {
          color: var(--grampsjs-task-open);
        }

        .error,
        .blocked {
          color: var(--grampsjs-alert-error-font-color);
        }

        .warn {
          color: var(--grampsjs-alert-warn-font-color);
        }

        .strike {
          text-decoration: line-through !important;
        }

        .taskbar md-outlined-button {
          margin-right: 8px;
        }

        md-outlined-button {
          --md-outlined-button-outline-color: var(--md-sys-color-secondary);
          --md-outlined-button-label-text-color: var(--md-sys-color-secondary);
          --md-outlined-button-hover-outline-color: var(
            --md-sys-color-secondary
          );
          --md-outlined-button-focus-outline-color: var(
            --md-sys-color-secondary
          );
          --md-outlined-button-hover-label-text-color: var(
            --md-sys-color-secondary
          );
          --md-outlined-button-focus-label-text-color: var(
            --md-sys-color-secondary
          );
          --md-outlined-button-pressed-label-text-color: var(
            --md-sys-color-secondary
          );
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
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      _selected: {type: Array},
    }
  }

  constructor() {
    super()
    this.data = []
    this._selected = []
  }

  render() {
    return html`
      ${this._renderFilters()}
      ${this.appState.permissions.canEdit ? this._renderTaskBar() : ''}
      ${this._renderTaskList(this.data)}
    `
  }

  _renderFilters() {
    return html`
      <div class="filters">
        <grampsjs-filters .appState="${this.appState}" objectType="sources">
          <grampsjs-filter-tags
            .appState="${this.appState}"
          ></grampsjs-filter-tags>
        </grampsjs-filters>
      </div>
    `
  }

  _renderTaskBar() {
    return html`
      <div class="taskbar">
        <md-checkbox
          id="select-all"
          @change="${this._handleSelectAll}"
          ?checked=${this._selected.length > 0}
        ></md-checkbox>
        <div style="position: relative; display: inline-block;">
          <md-outlined-button
            id="prio-btn"
            class="edit"
            ?disabled="${this._selected.length === 0}"
            @click="${this._handleSetPrioClick}"
            >${this._('Set Priority')}</md-outlined-button
          >
          <md-menu id="prio-menu" anchor="prio-btn">
            <md-menu-item @click="${() => this._handlePrioSet('1')}">
              <div slot="headline">${this._('High')}</div>
            </md-menu-item>
            <md-menu-item @click="${() => this._handlePrioSet('5')}">
              <div slot="headline">${this._('Medium')}</div>
            </md-menu-item>
            <md-menu-item @click="${() => this._handlePrioSet('9')}">
              <div slot="headline">${this._('Low')}</div>
            </md-menu-item>
          </md-menu>
        </div>
        <div style="position: relative; display: inline-block;">
          <md-outlined-button
            id="status-btn"
            class="edit"
            ?disabled="${this._selected.length === 0}"
            @click="${this._handleSetStatusClick}"
            >${this._('Set Status')}</md-outlined-button
          >
          <md-menu id="status-menu" anchor="status-btn">
            <md-menu-item @click="${() => this._handleStatusSet('Open')}">
              <div slot="headline">${this._('Open')}</div>
            </md-menu-item>
            <md-menu-item
              @click="${() => this._handleStatusSet('In Progress')}"
            >
              <div slot="headline">${this._('In Progress')}</div>
            </md-menu-item>
            <md-menu-item @click="${() => this._handleStatusSet('Blocked')}">
              <div slot="headline">${this._('Blocked')}</div>
            </md-menu-item>
            <md-menu-item @click="${() => this._handleStatusSet('Done')}">
              <div slot="headline">${this._('Done')}</div>
            </md-menu-item>
          </md-menu>
        </div>
      </div>
    `
  }

  _handlePrioSet(value) {
    if (value) {
      this._updateAttributes(this._selected, 'Priority', value)
    }
    this._selected = []
  }

  _handleSetPrioClick() {
    const menu = this.renderRoot.getElementById('prio-menu')
    menu.open = true
  }

  _handleStatusSet(value) {
    if (value) {
      this._updateAttributes(this._selected, 'Status', value)
    }
    this._selected = []
  }

  _handleSetStatusClick() {
    const menu = this.renderRoot.getElementById('status-menu')
    menu.open = true
  }

  _renderTaskList(data) {
    return html`
      <div class="tasks-list" id="all-tasks">
        ${data.map((obj, i) => this._renderTask(obj, i))}
      </div>
    `
  }

  _handleItemCheck(e, i) {
    if (e.target.checked) {
      if (!this._selected.includes(i)) {
        this._selected = [...this._selected, i]
      }
    } else {
      this._selected = this._selected.filter(s => s !== i)
    }
  }

  _handleSelectAll() {
    if (this._selected.length === 0) {
      this._selected = [...Array(this.data.length).keys()]
    } else {
      this._selected = []
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _statusIcon(status, handle) {
    const id = `status-icon-${handle}`
    const icons = {
      Open: html`<grampsjs-icon
        path="${mdiRadioboxBlank}"
        color="var(--grampsjs-task-open)"
        id="${id}"
        height="20"
        width="20"
      ></grampsjs-icon>`,
      'In Progress': html`<grampsjs-icon
        path="${mdiTimelapse}"
        color="var(--grampsjs-task-progress)"
        id="${id}"
        height="20"
        width="20"
      ></grampsjs-icon>`,
      Blocked: html`<grampsjs-icon
        path="${mdiMinusCircle}"
        color="var(--grampsjs-alert-error-font-color)"
        id="${id}"
        height="20"
        width="20"
      ></grampsjs-icon>`,
      Done: html`<grampsjs-icon
        path="${mdiCheckCircle}"
        color="var(--grampsjs-task-done)"
        id="${id}"
        height="20"
        width="20"
      ></grampsjs-icon>`,
      unknown: html`<grampsjs-icon
        path="${mdiHelp}"
        id="${id}"
        height="20"
        width="20"
      ></grampsjs-icon>`,
    }
    const icon = icons[status] || icons.unknown
    return html`
      ${icon}
      <grampsjs-tooltip for="${id}" .appState="${this.appState}"
        >${this._(status)}</grampsjs-tooltip
      >
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _priorityIcon(priority, handle) {
    const id = `priority-icon-${handle}`
    let label = ''
    if (priority > 5) {
      label = 'Low'
    } else if (priority === '5') {
      label = 'Medium'
    } else if (priority < 5) {
      label = 'High'
    } else {
      return ''
    }
    const icons = {
      Low: html`<grampsjs-icon
        path="${mdiChevronDoubleDown}"
        color="var(--grampsjs-alert-success-font-color)"
        id="${id}"
        height="20"
        width="20"
      ></grampsjs-icon>`,
      Medium: html`<grampsjs-icon
        path="${mdiAdjust}"
        id="${id}"
        height="20"
        width="20"
      ></grampsjs-icon>`,
      High: html`<grampsjs-icon
        path="${mdiChevronDoubleUp}"
        color="var(--grampsjs-alert-error-font-color)"
        id="${id}"
        height="20"
        width="20"
      ></grampsjs-icon>`,
    }
    const icon = icons[label]
    return html`
      <span class="priority-label">
        ${icon}
        <grampsjs-tooltip for="${id}" .appState="${this.appState}"
          >${this._('Priority')}: ${this._(label)}</grampsjs-tooltip
        >
      </span>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _getAttribute(obj, key) {
    return obj.attribute_list.filter(att => att.type === key)[0]?.value
  }

  // eslint-disable-next-line class-methods-use-this
  _renderTask(obj, i) {
    const status = this._getAttribute(obj, 'Status')
    const priority = this._getAttribute(obj, 'Priority')
    return html`
      <div
        class="task-item"
        @keydown="${e => this._handleListKeyDown(e, obj.gramps_id)}"
      >
        <md-checkbox
          ?checked="${this._selected.includes(i)}"
          @change="${e => this._handleItemCheck(e, i)}"
        ></md-checkbox>
        <div class="item-content">
          <div class="status-icon">${this._statusIcon(status, obj.handle)}</div>
          <div class="title">
            <span
              class="${classMap({
                link: true,
                strike: status === 'Done',
              })}"
              @click="${e => this._handleTitleClick(e, obj.gramps_id)}"
              @keydown="${clickKeyHandler}"
              >${obj.title}</span
            >
            <grampsjs-tags-small
              .data="${obj.extended.tags.filter(tag => tag.name !== 'ToDo')}"
            ></grampsjs-tags-small>
          </div>
        </div>
        <div class="task-meta">
          <span class="prio-icon"
            >${this._priorityIcon(priority, obj.handle)}</span
          >
        </div>
      </div>
    `
  }

  _handleTitleClick(e, grampsId) {
    fireEvent(this, 'nav', {path: `task/${grampsId}`})
    e.stopPropagation()
  }

  _handleListKeyDown(e, grampsId) {
    if (e.key === 'ArrowRight') {
      fireEvent(this, 'nav', {path: `task/${grampsId}`})
    }
  }

  async _updateAttributes(indices, key, value) {
    const objects = this.data.filter((obj, ind) => indices.includes(ind))
    fireEvent(this, 'tasks:update-attribute', {objects, key, value})
  }
}

window.customElements.define('grampsjs-tasks', GrampsjsTasks)
