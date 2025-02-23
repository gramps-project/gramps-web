import {css, html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/web/list/list'
import '@material/web/list/list-item'
import '@material/web/button/filled-tonal-button'
import '@material/web/button/text-button'

import '../components/GrampsjsTimedelta.js'
import '../components/GrampsjsSearchResultList.js'
import '../components/GrampsjsDiffJson.js'
import '../components/GrampsjsBreadcrumbs.js'

import {mdiClose} from '@mdi/js'
import {GrampsjsView} from './GrampsjsView.js'

import {renderIconSvg} from '../icons.js'

export class GrampsjsViewRevision extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        md-list-item {
          --md-list-item-label-text-weight: 350;
          --md-list-item-label-text-size: 17px;
          --md-list-item-supporting-text-color: rgba(0, 0, 0, 0.5);
          --md-list-item-trailing-supporting-text-color: rgba(0, 0, 0, 0.8);
        }

        svg[slot='end'] {
          height: 22px;
          width: 22px;
          opacity: 0.9;
        }

        md-divider {
          --md-divider-thickness: 1px;
          --md-divider-color: rgba(0, 0, 0, 0.1);
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
          color: rgba(0, 0, 0, 0.6);
        }

        span.user {
          font-weight: 440;
        }
      `,
    ]
  }

  static get properties() {
    return {
      transactionId: {type: Number},
      _data: {type: Object},
      _detailId: {type: Number},
    }
  }

  constructor() {
    super()
    this.transactionId = -1
    this._data = {}
    this._detailId = -1
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

      <h2>${this._(this._data.description)}</h2>

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
          Close</md-text-button
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
