/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/mwc-checkbox'
import '@material/mwc-icon'
import '@material/mwc-button'
import '@material/mwc-icon-button'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'
import '@material/mwc-list/mwc-check-list-item'

import './GrampsjsFilters.js'
import './GrampsjsFilterTags.js'
import './GrampsjsTagsSmall.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {clickKeyHandler, fireEvent} from '../util.js'

class GrampsjsTasks extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        mwc-list {
          --mdc-typography-subtitle1-font-size: 15px;
          margin-bottom: 85px;
        }

        mwc-check-list-item {
          border-top: 1px solid var(--grampsjs-body-font-color-10);
          height: auto;
          width: 100%;
        }

        mwc-check-list-item:last-child {
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
        }

        .status-icon {
          width: 32px;
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

        mwc-checkbox#select-all {
          margin-right: 8px;
        }

        .filters {
          margin-bottom: 32px;
        }

        .taskbar {
          padding-left: 10px;
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }

        mwc-check-list-item mwc-icon {
          color: var(--grampsjs-body-font-color-30);
          --mdc-icon-size: 20px;
        }

        .status-icon mwc-icon {
          margin-right: 12px;
          position: relative;
          top: 3px;
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

        .taskbar mwc-button {
          margin-right: 8px;
        }

        .prio-icon mwc-icon {
          padding-left: 8px;
          position: relative;
          top: 2px;
        }

        grampsjs-tags-small {
          margin-left: 1em;
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
        <mwc-checkbox
          id="select-all"
          @change="${this._handleSelectAll}"
          ?checked=${this._selected.length > 0}
        ></mwc-checkbox>
        <div style="position: relative; display: inline-block;">
          <mwc-button
            id="prio-btn"
            outlined
            class="edit"
            ?disabled="${this._selected.length === 0}"
            @click="${this._handleSetPrioClick}"
            >${this._('Set Priority')}</mwc-button
          >
          <mwc-menu
            @action="${this._handlePrioSet}"
            id="prio-menu"
            .anchor=${this.prioBtn}
            x="0"
            y="40"
          >
            <mwc-list-item>${this._('High')}</mwc-list-item>
            <mwc-list-item>${this._('Medium')}</mwc-list-item>
            <mwc-list-item>${this._('Low')}</mwc-list-item>
          </mwc-menu>
        </div>
        <div style="position: relative; display: inline-block;">
          <mwc-button
            id="prio-btn"
            outlined
            class="edit"
            ?disabled="${this._selected.length === 0}"
            @click="${this._handleSetStatusClick}"
            >${this._('Set Status')}</mwc-button
          >
          <mwc-menu
            @action="${this._handleStatusSet}"
            id="status-menu"
            .anchor=${this.statusBtn}
            x="0"
            y="40"
          >
            <mwc-list-item>${this._('Open')}</mwc-list-item>
            <mwc-list-item>${this._('In Progress')}</mwc-list-item>
            <mwc-list-item>${this._('Blocked')}</mwc-list-item>
            <mwc-list-item>${this._('Done')}</mwc-list-item>
          </mwc-menu>
        </div>
      </div>
    `
  }

  get prioBtn() {
    return this.renderRoot.getElementById('prio-btn')
  }

  get statusBtn() {
    return this.renderRoot.getElementById('status-btn')
  }

  _handlePrioSet(e) {
    this.renderRoot.getElementById('prio-menu').select(null)
    const values = {0: '1', 1: '5', 2: '9'}
    const value = values[e.detail.index]
    if (value) {
      this._updateAttributes(this._selected, 'Priority', value)
    }
    this._selected = []
  }

  _handleSetPrioClick() {
    const menu = this.renderRoot.getElementById('prio-menu')
    menu.open = true
  }

  _handleStatusSet(e) {
    this.renderRoot.getElementById('prio-menu').select(null)
    const values = {0: 'Open', 1: 'In Progress', 2: 'Blocked', 3: 'Done'}
    const value = values[e.detail.index]
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
    return html` <mwc-list multi @action="${this._handleAction}" id="all-tasks">
      ${data.map((obj, i) => this._renderTask(obj, i))}
    </mwc-list>`
  }

  _handleAction(e) {
    this._selected = [...e.target.index]
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
      Open: html`<mwc-icon class="open" id="${id}"
        >radio_button_unchecked</mwc-icon
      >`,
      'In Progress': html`<mwc-icon class="progress" id="${id}"
        >timelapse</mwc-icon
      >`,
      Blocked: html`<mwc-icon class="blocked" id="${id}"
        >remove_circle</mwc-icon
      >`,
      Done: html`<mwc-icon class="done" id="${id}">check_circle</mwc-icon>`,
      unknown: html`<mwc-icon class="" id="${id}">help</mwc-icon>`,
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
      Low: html`<mwc-icon class="success" id="${id}"
        >keyboard_double_arrow_down</mwc-icon
      >`,
      Medium: html`<mwc-icon id="${id}">adjust</mwc-icon>`,
      High: html`<mwc-icon class="error" id="${id}"
        >keyboard_double_arrow_up</mwc-icon
      >`,
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
      <mwc-check-list-item
        left
        hasMeta
        graphic=""
        ?selected="${this._selected.includes(i)}"
        @keydown="${e => this._handleListKeyDown(e, obj.gramps_id)}"
      >
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
        <div slot="meta">
          <span class="prio-icon"
            >${this._priorityIcon(priority, obj.handle)}</span
          >
        </div>
      </mwc-check-list-item>
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
