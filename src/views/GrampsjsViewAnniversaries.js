import {html, css} from 'lit'
import '@material/mwc-button'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet} from '../api.js'
import '../components/GrampsjsTimedelta.js'
import {eventTitleFromProfile} from '../util.js'

export class GrampsjsViewAnniversaries extends GrampsjsView {
  static get styles () {
    return [
      super.styles,
      css`
      :host {
        margin: 0;
      }

      .date {
        font-size: 0.9em;
        color: rgba(0, 0, 0, 0.5);
      }

      .title {
        margin-top: 0.4em;
        margin-bottom: 0.7em;
      }
      `
    ]
  }

  static get properties () {
    return {
      data: {type: Array}
    }
  }

  constructor () {
    super()
    this.data = []
  }

  renderContent () {
    if (this.data.length === 0) {
      return html``
    }
    return html`<h2>${this._('Anniversaries')}</h2>

    ${this.data.map(event => this._renderEvent(event))}

    `
  }

  _renderEvent (event) {
    let date = new Date()
    date = new Date(event.date.year, date.getMonth(), date.getDay())
    const timestamp = date.getTime() / 1000
    console.log([date, timestamp])
    return html`
    <div class="event">
      <div class="date">
      <grampsjs-timedelta
        timestamp="${timestamp}"
        locale="${this.strings.__lang__}"
      ></grampsjs-timedelta>
      </div>
      <div class="title">
        <a href="/event/${event.gramps_id}">${eventTitleFromProfile(event.profile, this.strings)}</a>
      </div>
    </div>`
  }

  async _fetchData (lang) {
    this.loading = true
    const now = new Date()
    const m = now.getMonth() + 1
    const d = now.getDate()
    const data = await apiGet(`/api/events/?dates=*/${m}/${d}&profile=all&sort=-date&locale=${lang || 'en'}`)
    this.loading = false
    if ('data' in data) {
      this.error = false
      this.data = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  connectedCallback () {
    super.connectedCallback()
    window.addEventListener('language:changed', (e) => this._fetchData(e.detail.lang))
  }

  firstUpdated () {
    if ('__lang__' in this.strings) { // don't load before we have strings
      this._fetchData(this.strings.__lang__)
    }
  }
}

window.customElements.define('grampsjs-view-anniversaries', GrampsjsViewAnniversaries)
