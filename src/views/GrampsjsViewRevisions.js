import {css, html} from 'lit'

import '@material/web/list/list'
import '@material/web/list/list-item'
import {
  mdiSourceCommit,
  mdiAccountPlus,
  mdiAccountMultiplePlus,
  mdiCalendarPlus,
  mdiTagPlus,
  mdiBookPlus,
  mdiBookPlusMultiple,
  mdiBankPlus,
  mdiImagePlus,
  mdiMapMarkerPlus,
  mdiFileDocumentPlus,
  mdiAccountEdit,
  // mdiAccountMultipleEdit,
  mdiAccountMultiple,
  mdiCalendarEdit,
  mdiTagEdit,
  mdiBookEdit,
  // mdiBookEditMultiple,
  mdiBookmarkMultiple,
  // mdiBankEdit,
  mdiBank,
  mdiImageEdit,
  // mdiMapMarkerEdit,
  mdiMapMarker,
  mdiFileDocumentEdit,
  mdiAccountMinus,
  mdiAccountMultipleMinus,
  mdiCalendarMinus,
  mdiTagMinus,
  mdiBookMinus,
  mdiBookMinusMultiple,
  mdiBankMinus,
  mdiImageMinus,
  mdiMapMarkerMinus,
  mdiFileDocumentMinus,
  mdiTimelineQuestionOutline,
} from '@mdi/js'

import '../components/GrampsjsPagination.js'
import '../components/GrampsjsTimedelta.js'

import {GrampsjsView} from './GrampsjsView.js'

import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'

import {renderIconSvg} from '../icons.js'

const changeIcons = {
  Person_0: mdiAccountPlus,
  Family_0: mdiAccountMultiplePlus,
  Event_0: mdiCalendarPlus,
  Place_0: mdiMapMarkerPlus,
  Source_0: mdiBookPlusMultiple,
  Citation_0: mdiBookPlus,
  Repository_0: mdiBankPlus,
  Note_0: mdiFileDocumentPlus,
  Tag_0: mdiTagPlus,
  Media_0: mdiImagePlus,
  Person_1: mdiAccountEdit,
  Family_1: mdiAccountMultiple,
  Event_1: mdiCalendarEdit,
  Place_1: mdiMapMarker,
  Source_1: mdiBookmarkMultiple,
  Citation_1: mdiBookEdit,
  Repository_1: mdiBank,
  Note_1: mdiFileDocumentEdit,
  Tag_1: mdiTagEdit,
  Media_1: mdiImageEdit,
  Person_2: mdiAccountMinus,
  Family_2: mdiAccountMultipleMinus,
  Event_2: mdiCalendarMinus,
  Place_2: mdiMapMarkerMinus,
  Source_2: mdiBookMinusMultiple,
  Citation_2: mdiBookMinus,
  Repository_2: mdiBankMinus,
  Note_2: mdiFileDocumentMinus,
  Tag_2: mdiTagMinus,
  Media_2: mdiImageMinus,
}

export class GrampsjsViewRevisions extends GrampsjsStaleDataMixin(
  GrampsjsView
) {
  static get styles() {
    return [
      super.styles,
      css`
        md-list-item[type='text'] {
          --md-list-item-label-text-color: var(--grampsjs-body-font-color-48);
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

        .counter {
          position: relative;
          color: white;
          font-size: 11px;
          min-width: 14px;
          height: 14px;
          line-height: 16px;
          left: -17px;
          top: -6px;
          font-weight: 600;
          background-color: var(--grampsjs-body-font-color-35);
          border-radius: 100px;
          display: inline-block;
          text-align: center;
          vertical-align: middle;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _data: {type: Array},
      _page: {type: Number},
      _pages: {type: Number},
      _pageSize: {type: Number},
    }
  }

  constructor() {
    super()
    this._data = []
    this._page = 1
    this._pages = -1
    this._pageSize = 20
  }

  render() {
    return html`
      <h2>${this._('Revision History')}</h2>

      <md-list>
        <md-divider></md-divider>
        ${this._data.map(txn => this._renderTransaction(txn))}
      </md-list>

      <grampsjs-pagination
        page="${this._page}"
        pages="${this._pages}"
        @page:changed="${this._handlePageChanged}"
        .appState="${this.appState}"
      ></grampsjs-pagination>
    `
  }

  _renderTransaction(txn) {
    // eslint-disable-next-line camelcase
    const counts = txn.changes.reduce((acc, {obj_class, trans_type}) => {
      // eslint-disable-next-line camelcase
      const key = `${obj_class}_${trans_type}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return html`<md-list-item
        ?interactive="${!!txn.changes?.length}"
        type="${txn.changes?.length ? 'link' : 'text'}"
        href="${txn.changes?.length ? `/revision/${txn.id}` : ''}"
      >
        <div slot="headline">${this._(txn.description)}</div>
        ${renderIconSvg(mdiSourceCommit, '#777', 0, 'start')}
        ${txn.changes?.length
          ? Object.keys(counts).map(key =>
              changeIcons[key]
                ? html`
                      ${
                        renderIconSvg(
                          changeIcons[key],
                          'var(--grampsjs-body-font-color-45)',
                          0,
                          'end'
                        )
                        // <span slot="end" class="counter">${counts[key]}</span>
                      } </span
                    > `
                : ''
            )
          : renderIconSvg(
              mdiTimelineQuestionOutline,
              'var(--grampsjs-body-font-color-45)',
              0,
              'end'
            )}
        <div slot="supporting-text">
          <span class="user">
            ${txn.connection?.user
              ? this._renderUser(txn.connection?.user)
              : this._('Unknown')},
          </span>
          <span class="time">
            <grampsjs-timedelta
              timestamp="${txn.timestamp}"
              locale="${this.appState.i18n.lang}"
            ></grampsjs-timedelta>
          </span>
        </div>
      </md-list-item>
      <md-divider></md-divider> `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderUser(user) {
    return user.full_name || user.name
  }

  async _fetchData() {
    this.loading = true
    const url = `/api/transactions/history/?sort=-id&page=${this._page}&pagesize=${this._pageSize}`
    const data = await this.appState.apiGet(url)
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._data = data.data
      this._totalCount = data.total_count
      this._pages = Math.ceil(this._totalCount / this._pageSize)
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  _handlePageChanged(event) {
    this._page = event.detail.page
  }

  firstUpdated() {
    this._fetchData()
  }

  handleUpdateStaleData() {
    this._fetchData()
  }

  update(changed) {
    super.update(changed)
    if (changed.has('_page') && changed._page !== this._page) {
      this._fetchData()
    }
  }
}

window.customElements.define('grampsjs-view-revisions', GrampsjsViewRevisions)
