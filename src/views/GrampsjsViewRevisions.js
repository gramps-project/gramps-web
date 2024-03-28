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
  mdiCalendarEdit,
  mdiTagEdit,
  mdiBookEdit,
  // mdiBookEditMultiple,
  // mdiBankEdit,
  mdiImageEdit,
  // mdiMapMarkerEdit,
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
} from '@mdi/js'

import '../components/GrampsjsTimedelta.js'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet} from '../api.js'
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
  Family_1: null,
  Event_1: mdiCalendarEdit,
  Place_1: null,
  Source_1: null,
  Citation_1: mdiBookEdit,
  Repository_1: null,
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

const colors = {
  10: '#4caf50',
  11: 'var(--mdc-theme-secondary)',
  12: '#bf360c',
  0: 'rgba(0, 0, 0, 0.45)',
  1: 'rgba(0, 0, 0, 0.45)',
  2: 'rgba(0, 0, 0, 0.45)',
}

export class GrampsjsViewRevisions extends GrampsjsView {
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
          background-color: rgba(0, 0, 0, 0.35);
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
    }
  }

  constructor() {
    super()
    this._data = []
  }

  render() {
    return html`
      <h2>${this._('Revision History')}</h2>

      <md-list>
        <md-divider></md-divider>
        ${this._data.map(txn => this._renderTransaction(txn))}
      </md-list>
    `
  }

  // <pre>
  // ${JSON.stringify(this._data, null, 2)}
  // </pre>

  _renderTransaction(txn) {
    // eslint-disable-next-line camelcase
    const counts = txn.changes.reduce((acc, {obj_class, trans_type}) => {
      // eslint-disable-next-line camelcase
      const key = `${obj_class}_${trans_type}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return html`<md-list-item
        interactive
        type="link"
        href="/revision/${txn.id}"
      >
        <div slot="headline">${this._(txn.description)}</div>
        ${renderIconSvg(mdiSourceCommit, '#777777', 0, 'start')}
        ${Object.keys(counts).map(key =>
          changeIcons[key]
            ? html`
                ${renderIconSvg(
                  changeIcons[key],
                  colors[key.split('_')[1]],
                  0,
                  'end'
                )}
                <span slot="end" class="counter">${counts[key]}</span>
              `
            : ''
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
              locale="${this.strings.__lang__}"
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
    const data = await apiGet(
      '/api/transactions/history/?sort=-id&page=1&pagesize=100'
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

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('db:changed', () => this._fetchData())
  }
}

window.customElements.define('grampsjs-view-revisions', GrampsjsViewRevisions)
