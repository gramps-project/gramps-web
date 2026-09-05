/*
The revision history of a single object.
*/

import {html, css, LitElement} from 'lit'

import '@material/web/button/text-button'
import '@material/web/list/list'
import '@material/web/list/list-item'
import {
  mdiPlusCircleOutline,
  mdiPencilOutline,
  mdiDeleteOutline,
  mdiHelpCircleOutline,
} from '@mdi/js'

import './GrampsjsIcon.js'
import './GrampsjsTimedelta.js'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'

const PAGE_SIZE = 10
const MAX_ITEMS = 50

const transTypeIcons = {
  0: mdiPlusCircleOutline,
  1: mdiPencilOutline,
  2: mdiDeleteOutline,
}

const transTypeLabels = {
  0: 'Added',
  1: 'Edited',
  2: 'Deleted',
}

export class GrampsjsObjectRevisions extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        p.last-change {
          color: var(--grampsjs-body-font-color-60);
        }

        grampsjs-icon[slot='start'] {
          height: 22px;
          width: 22px;
          opacity: 0.9;
        }
      `,
    ]
  }

  static get properties() {
    return {
      objClass: {type: String},
      handle: {type: String},
      lastChange: {type: Number},
      _data: {type: Array},
      _totalCount: {type: Number},
      _loading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.objClass = ''
    this.handle = ''
    this.lastChange = 0
    this._data = []
    this._totalCount = 0
    this._loading = false
    this._fetchedKey = ''
    this._boundHandleDbChanged = this._handleDbChanged.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('db:changed', this._boundHandleDbChanged)
  }

  disconnectedCallback() {
    window.removeEventListener('db:changed', this._boundHandleDbChanged)
    super.disconnectedCallback()
  }

  render() {
    if (this._data.length === 0) {
      return this._loading ? html`` : this._renderLastChange()
    }
    return html`
      <md-list>
        ${this._data.map(change => this._renderChange(change))}
      </md-list>
      ${this._renderFooter()}
    `
  }

  // Objects changed before the tree recorded a history still carry a
  // last-change timestamp.
  _renderLastChange() {
    if (!this.lastChange) {
      return html``
    }
    return html`
      <p class="last-change">
        ${this._('Last changed')}:
        <grampsjs-timedelta
          timestamp="${this.lastChange}"
          locale="${this.appState.i18n.lang}"
        ></grampsjs-timedelta>
      </p>
    `
  }

  _renderFooter() {
    if (this._data.length >= this._totalCount) {
      return html``
    }
    if (this._data.length >= MAX_ITEMS) {
      return html`
        <p class="last-change">
          ${this._('Only the most recent revisions are shown.')}
        </p>
      `
    }
    return html`
      <p>
        <md-text-button
          ?disabled="${this._loading}"
          @click="${this._handleShowMore}"
        >
          ${this._('Show more')}
        </md-text-button>
      </p>
    `
  }

  _renderChange(change) {
    const transactionId = change.transaction_id
    return html`
      <md-list-item
        ?interactive="${!!transactionId}"
        type="${transactionId ? 'link' : 'text'}"
        href="${transactionId ? `/revision/${transactionId}` : ''}"
      >
        <div slot="headline">
          ${this._(transTypeLabels[change.trans_type] || 'Unknown')}
        </div>
        <grampsjs-icon
          slot="start"
          path="${transTypeIcons[change.trans_type] || mdiHelpCircleOutline}"
          color="var(--grampsjs-body-font-color-50)"
        ></grampsjs-icon>
        <div slot="supporting-text">
          <span class="user">
            ${change.connection?.user
              ? this._renderUser(change.connection.user)
              : this._('Unknown')},
          </span>
          <span class="time">
            <grampsjs-timedelta
              timestamp="${change.timestamp}"
              locale="${this.appState.i18n.lang}"
            ></grampsjs-timedelta>
          </span>
        </div>
      </md-list-item>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderUser(user) {
    return user.full_name || user.name
  }

  async _fetchData(page = 1) {
    if (!this.objClass || !this.handle) {
      return
    }
    this._loading = true
    const url = `/api/transactions/history/objects/${this.objClass}/${this.handle}?sort=-id&page=${page}&pagesize=${PAGE_SIZE}`
    try {
      const data = await this.appState.apiGet(url)
      if ('data' in data) {
        this._data = page === 1 ? data.data : [...this._data, ...data.data]
        this._totalCount = parseInt(data.total_count, 10) || 0
      }
    } finally {
      this._loading = false
    }
  }

  _handleShowMore() {
    this._fetchData(Math.floor(this._data.length / PAGE_SIZE) + 1)
  }

  _handleDbChanged() {
    this._fetchData()
  }

  updated(changed) {
    super.updated(changed)
    const key = `${this.objClass}/${this.handle}`
    if (this.objClass && this.handle && key !== this._fetchedKey) {
      this._fetchedKey = key
      this._data = []
      this._totalCount = 0
      this._fetchData()
    }
  }
}

window.customElements.define(
  'grampsjs-object-revisions',
  GrampsjsObjectRevisions
)
