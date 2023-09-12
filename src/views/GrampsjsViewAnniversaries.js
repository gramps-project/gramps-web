import {html, css} from 'lit'
import '@material/mwc-button'

import '../components/GrampsjsTimedelta.js'
import {GrampsjsConnectedComponent} from '../components/GrampsjsConnectedComponent.js'
import {eventTitleFromProfile, fireEvent} from '../util.js'

export class GrampsjsViewAnniversaries extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      super.styles,
      css`
        .date {
          font-size: 0.9em;
          color: rgba(0, 0, 0, 0.5);
        }

        .title {
          margin-top: 0.4em;
          margin-bottom: 0.7em;
        }

        h3 {
          margin-bottom: 15px;
        }

        .years {
          height: 38px;
          width: 38px;
          border-radius: 19px;
          background-color: var(--mdc-theme-primary);
          opacity: 0.6;
          color: white;
          font-size: 15px;
          line-height: 38px;
          display: inline-block;
          text-align: center;
          font-family: var(--grampsjs-heading-font-family);
          font-weight: 300;
        }
      `,
    ]
  }

  renderLoading() {
    return html`<h3>${this._('Anniversaries')}</h3>
      <mwc-list>
        ${Array(2).fill(
          html`
            <mwc-list-item noninteractive twoline graphic="avatar">
              <span class="skeleton" style="width:15em;">&nbsp;</span>
              <span slot="secondary" class="skeleton" style="width:10em;"
                >&nbsp;</span
              >
              <span slot="graphic" class="skeleton avatar">&nbsp;</span>
            </mwc-list-item>
          `
        )}
      </mwc-list>`
  }

  renderContent() {
    return html`<h3>${this._('Anniversaries')}</h3>
      ${this._data.data.length === 0
        ? html`<p>${this._('No items')}.</p>`
        : html`
            <mwc-list class="large">
              ${this._data.data.map(event => this._renderEvent(event))}
            </mwc-list>
          `} `
  }

  _renderEvent(event) {
    let date = new Date()
    date = new Date(event.date.year, date.getMonth(), date.getDate())
    const timestamp = date.getTime() / 1000
    const years = new Date().getFullYear() - date.getFullYear()
    if (years < 1) {
      return ''
    }
    return html`
      <mwc-list-item
        twoline
        graphic="avatar"
        @click="${() => this._handleClick(event)}"
        @keydown="${this._handleKeyDown}"
      >
        <span
          >${eventTitleFromProfile(event.profile, this.strings, false)}</span
        >
        <span slot="graphic" class="years">${years}</span>
        <span slot="secondary">
          <grampsjs-timedelta
            timestamp="${timestamp}"
            locale="${this.strings.__lang__}"
          ></grampsjs-timedelta
          >${event?.profile?.place ? html`, ${event.profile.place}` : ''}
        </span>
      </mwc-list-item>
    `
  }

  _handleClick(event) {
    const path = `event/${event.gramps_id}`
    fireEvent(this, 'nav', {path})
  }

  // eslint-disable-next-line class-methods-use-this
  _handleKeyDown(event) {
    if (event.code === 'Enter') {
      event.target.click()
      event.preventDefault()
      event.stopPropagation()
    }
  }

  getUrl() {
    const now = new Date()
    const m = now.getMonth() + 1
    const d = now.getDate()
    return `/api/events/?dates=*/${m}/${d}&profile=all&sort=-date&locale=${
      this.strings.__lang__ || 'en'
    }&pagesize=10&page=1`
  }
}

window.customElements.define(
  'grampsjs-view-anniversaries',
  GrampsjsViewAnniversaries
)
