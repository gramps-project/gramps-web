import {html, css} from 'lit'
import '@material/mwc-button'

import '../components/GrampsjsTimedelta.js'
import {GrampsjsConnectedComponent} from '../components/GrampsjsConnectedComponent.js'
import {eventTitleFromProfile} from '../util.js'

export class GrampsjsViewAnniversaries extends GrampsjsConnectedComponent {
  static get styles () {
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
      `
    ]
  }

  renderLoading () {
    return html`<h2>${this._('Anniversaries')}</h2>
    <div class="event">
      <div class="date">
        <span class="skeleton" style="width:7em;">&nbsp;</span>
      </div>
      <div class="title">
        <span class="skeleton" style="width:15em;">&nbsp;</span>
      </div>
    </div>
    <div class="event">
      <div class="date">
        <span class="skeleton" style="width:7em;">&nbsp;</span>
      </div>
      <div class="title">
        <span class="skeleton" style="width:15em;">&nbsp;</span>
      </div>
    </div>
    `
  }

  renderContent () {
    return html`<h2>${this._('Anniversaries')}</h2>

    ${this._data.data.map(event => this._renderEvent(event))}
    `
  }

  _renderEvent (event) {
    let date = new Date()
    date = new Date(event.date.year, date.getMonth(), date.getDay())
    const timestamp = date.getTime() / 1000
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

  getUrl () {
    const now = new Date()
    const m = now.getMonth() + 1
    const d = now.getDate()
    return `/api/events/?dates=*/${m}/${d}&profile=all&sort=-date&locale=${this.strings.__lang__ || 'en'}`
  }
}

window.customElements.define('grampsjs-view-anniversaries', GrampsjsViewAnniversaries)
