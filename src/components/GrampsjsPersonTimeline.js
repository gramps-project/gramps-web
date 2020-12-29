import {html, css, LitElement} from 'lit-element'
import {classMap} from 'lit-html/directives/class-map'
import {sharedStyles} from '../SharedStyles.js'
import '@material/mwc-button'
import '@material/mwc-icon'

import './GrampsjsMap.js'
import './GrampsjsMapMarker.js'


export class GrampsjsPersonTimeline extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
      .timeline-event {
        padding: 0.8em;
        display: grid;
        grid-gap: 15px;
        grid-template-columns: 150px minmax(150px, 1fr);
        background-color: #fff;
        color: #444;
      }

      .timeline-event.highlighted {
        background-color: rgba(0, 0, 0, 0.03);
      }

      .timeline-date-age {
        text-align: right;
        opacity: 0.75;
      }

      .timeline-age {
        font-weight: 400;
      }

      .timeline-detail {
      }

      span {
        display: block;
        margin-bottom: 0.12em;
        vertical-align: middle;
      }

      .timeline-label, .timeline-date {
        font-family: Roboto Slab;
        font-weight: 400;
        font-size: 18px;
        color: rgba(0, 0, 0, 0.8);
        margin-bottom: 0.4em;
      }


      .timeline-place, .timeline-description, .timeline-person, .timeline-age {
        display: block;
        font-family: Roboto;
        font-size: 17px;
      }


      .timeline-place, .timeline-description, .timeline-person {
        font-weight: 300;
      }


      .timeline-detail mwc-icon {
        --mdc-icon-size: 1em;
        color: rgba(0, 0, 0, 0.25);
        margin-right: 0.2em;
        position: relative;
        top: 0.13em;
      }

      .timeline-button {
        margin-top: 0.5em;
        visibility: hidden;
      }

      .timeline-event.highlighted .timeline-button {
        visibility: visible;
      }

      @media (min-width: 768px) {
      }

      #container {
        display: grid;
        grid-auto-columns: 1fr;
        grid-auto-flow: column;
      }

      #timeline {
      }

      #map {
        height: calc(100vh - 64px);
        position: sticky;
        top: 64px;
      }
      `
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      strings: {type: Object},
      highlightedId: {type: String}
    }
  }

  constructor() {
    super()
    this.data = []
    this.strings = {}
    this.highlightedId = ''
  }

  render() {
    if (this.data.length === 0) {
      return html``
    }
    return html`
    <div id="container">
      <div id="timeline">
        ${this.data.map(this.renderEvent, this)}
      </div>
      <div id="map">
      ${this.data.map(obj => obj.place?.lat || obj.place?.long).filter(Boolean).length > 0 ? html`
      ${this.renderMap()}
      `: ''}
      </div>
    </div>
    `
  }

  renderMap() {
    const mapCorners = this._getMapCorners()
    return html`
    <grampsjs-map
      latMin="${mapCorners[0][0]}"
      longMin="${mapCorners[0][1]}"
      latMax="${mapCorners[1][0]}"
      longMax="${mapCorners[1][1]}"
      mapid="timeline-map"
      id="timeline-map"
      >
        ${this.data.map(obj => {
    if (!obj.place?.lat || !obj.place?.long) {
      return ''
    }
    return html`
        <grampsjs-map-marker
        latitude="${obj.place.lat}"
        longitude="${obj.place.long}"
        >
        </grampsjs-map-marker>
        `}, this)}
      </grampsjs-map>
    `
  }

  _getMapCorners() {
    if (this.data.length === 0) {
      return [0, 0]
    }
    const places = this.data.filter(obj => obj?.place?.lat || obj?.place?.lat)
    if (places.length === 0) {
      // this should never happen
      return [[0, 0], [0, 0]]
    }
    const lats = places.map(obj => obj.place.lat || 0)
    const longs = places.map(obj => obj.place.long || 0)
    return [[Math.min(...lats), Math.min(...longs)], [Math.max(...lats), Math.max(...longs)]]
  }

  // eslint-disable-next-line class-methods-use-this
  renderEvent(obj) {
    return html`
    <div
    class=${classMap({'timeline-event': true, highlighted: obj.gramps_id === this.highlightedId})}
    @mouseover="${() => this._handleMouseOver(obj.gramps_id)}"
    @focus="${() => this._handleMouseOver(obj.gramps_id)}"
    >
      <div class="timeline-date-age">
        <span class="timeline-date">${obj.date}</span>
        <span class="timeline-age">${obj.span}</span>
      </div>
      <div class="timeline-detail">
        <span class="timeline-label">${obj.label}
      </span>
        ${obj.description ? html`
        <span class="timeline-description">${obj.description}</span>
        ` : ''}
        ${obj.place?.name ? html`
        <span class="timeline-place"><mwc-icon class="person">place</mwc-icon> ${obj.place.name}</span>
        ` : ''}
        ${obj.person?.name_given || obj.person?.name_surname  ? html`
        <span class="timeline-person"><mwc-icon class="person">person</mwc-icon> ${obj.person?.name_given || html`&hellip;`} ${obj.person?.name_surname || html`&hellip;`}</span>
        ` : ''}

        <span class="timeline-button">
          <mwc-button
            dense outlined
            label="${this._('Details')}"
            @click="${() => this._handleButtonClick(obj.gramps_id)}">
          </mwc-button>
        </span>
      </div>
    </div>
    `
  }

  _handleMouseOver(grampsId) {
    this.highlightedId = grampsId
  }


  _handleButtonClick(grampsId) {
    this.dispatchEvent(new CustomEvent('nav', {
      bubbles: true, composed: true, detail: {
        path: `event/${grampsId}`
      }
    }))
  }


  _(s) {
    if (s === undefined) {
      return ''
    }
    if (s in this.strings) {
      return this.strings[s].replace('_', '')
    }
    return s.replace('_', '')
  }
}


window.customElements.define('grampsjs-person-timeline', GrampsjsPersonTimeline)
