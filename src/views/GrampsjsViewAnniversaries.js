import {html, css} from 'lit'
import '@material/web/list/list'
import '@material/web/list/list-item'

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
          color: var(--grampsjs-body-font-color-50);
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
          margin-right: 10px;
        }
      `,
    ]
  }

  renderLoading() {
    return html`<h3>${this._('Anniversaries')}</h3>
      <md-list>
        ${Array(2).fill(
          html`
            <md-list-item type="button" noninteractive>
              <span slot="headline" class="skeleton" style="width:15em;"
                >&nbsp;</span
              >
              <span slot="supporting-text" class="skeleton" style="width:10em;"
                >&nbsp;</span
              >
              <span slot="start" class="skeleton avatar">&nbsp;</span>
            </md-list-item>
          `
        )}
      </md-list>`
  }

  renderContent() {
    return html`<h3>${this._('Anniversaries')}</h3>
      ${this._data.data.length === 0
        ? html`<p>${this._('None')}.</p>`
        : html`
            <md-list class="large">
              ${this._data.data.map(event => this._renderEvent(event))}
            </md-list>
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
      <md-list-item
        type="button"
        @click="${() => this._handleClick(event)}"
        @keydown="${this._handleKeyDown}"
      >
        <span slot="headline"
          >${eventTitleFromProfile(event.profile, false)}</span
        >
        <span slot="start" class="years">${years}</span>
        <span slot="supporting-text">
          <grampsjs-timedelta
            timestamp="${timestamp}"
            locale="${this.appState.i18n.lang}"
          ></grampsjs-timedelta>
          (${event.profile.date})
          ${event?.profile?.place
            ? html`<br />${event.profile.place_name || event.profile.place}`
            : ''}
        </span>
      </md-list-item>
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
      this.appState.i18n.lang || 'en'
    }&pagesize=10&page=1`
  }
}

window.customElements.define(
  'grampsjs-view-anniversaries',
  GrampsjsViewAnniversaries
)
