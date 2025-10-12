import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {sharedStyles} from '../SharedStyles.js'
import '@material/mwc-button'
import '@material/mwc-icon'

import './GrampsjsMap.js'
import './GrampsjsMapMarker.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsPersonTimeline extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .timeline-event {
          padding: 0.8em;
          display: grid;
          grid-gap: 15px;
          grid-template-columns: 150px minmax(150px, 1fr);
          background-color: var(--md-sys-color-surface-container);
          color: var(--grampsjs-body-font-color-75);
        }

        .timeline-event.highlighted {
          background-color: var(--grampsjs-color-shade-230);
          border-radius: 6px;
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
          margin-bottom: 0.2em;
          vertical-align: middle;
        }

        .timeline-label,
        .timeline-date {
          font-family: var(--grampsjs-heading-font-family);
          font-weight: 400;
          font-size: 18px;
          color: var(--grampsjs-body-font-color);
          margin-bottom: 0.4em;
        }

        .timeline-place,
        .timeline-description,
        .timeline-person,
        .timeline-age {
          display: block;
          font-family: var(--grampsjs-body-font-family);
          font-size: 17px;
        }

        .timeline-place,
        .timeline-description,
        .timeline-person {
          font-weight: 300;
        }

        .timeline-detail mwc-icon {
          --mdc-icon-size: 1em;
          color: var(--grampsjs-body-font-color-25);
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

        #timeline {
        }

        #map {
          display: none;
        }

        @media (min-width: 768px) {
          #map {
            height: calc(100vh - 64px);
            position: sticky;
            top: 64px;
            display: block;
          }

          #container {
            display: grid;
            grid-gap: 8px;
            grid-template-columns: 420px 1fr;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      highlightedId: {type: String},
    }
  }

  constructor() {
    super()
    this.data = []
    this.highlightedId = ''
  }

  render() {
    if (this.data.length === 0) {
      return html``
    }
    return html`
      <div id="container">
        <div id="timeline">${this.data.map(this.renderEvent, this)}</div>
        <div id="map">
          ${this.data
            .map(obj => obj.place?.lat || obj.place?.long)
            .filter(Boolean).length > 0
            ? html` ${this.renderMap()} `
            : ''}
        </div>
      </div>
    `
  }

  renderMap() {
    const mapCorners = this._getMapCorners()
    return html`
      <grampsjs-map
        .appState="${this.appState}"
        latMin="${mapCorners[0][0]}"
        longMin="${mapCorners[0][1]}"
        latMax="${mapCorners[1][0]}"
        longMax="${mapCorners[1][1]}"
        layerSwitcher
        mapid="timeline-map"
        id="timeline-map"
        @marker:clicked="${this._handleMapClick}"
      >
        ${this.data.map(obj => {
          if (!obj.place?.lat || !obj.place?.long) {
            return ''
          }
          return html`
            <grampsjs-map-marker
              latitude="${obj.place.lat}"
              longitude="${obj.place.long}"
              markerId="${obj.gramps_id}"
              opacity="${obj.gramps_id === this.highlightedId ? 1.0 : 0.5}"
            >
            </grampsjs-map-marker>
          `
        }, this)}
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
      return [
        [0, 0],
        [0, 0],
      ]
    }
    const lats = places.map(obj => obj.place.lat || 0)
    const longs = places.map(obj => obj.place.long || 0)
    return [
      [Math.min(...lats), Math.min(...longs)],
      [Math.max(...lats), Math.max(...longs)],
    ]
  }

  // eslint-disable-next-line class-methods-use-this
  renderEvent(obj) {
    return html`
      <div
        id="event-${obj.gramps_id}"
        class=${classMap({
          'timeline-event': true,
          highlighted: obj.gramps_id === this.highlightedId,
        })}
        @mouseover="${() => this._handleMouseOver(obj)}"
        @focus="${() => this._handleMouseOver(obj)}"
        @touchstart="${() => this._handleMouseOver(obj)}"
      >
        <div class="timeline-date-age">
          <span class="timeline-date">${obj.date}</span>
          <span class="timeline-age">${obj.age}</span>
        </div>
        <div class="timeline-detail">
          <span class="timeline-label"
            >${obj.label}
            ${
              // if role is not primary/family, show role
              obj.role &&
              ![this._('Family'), this._('Primary')].includes(obj.role)
                ? html`(${obj.role})`
                : ''
            }
          </span>
          ${obj.description
            ? html`
                <span class="timeline-description">${obj.description}</span>
              `
            : ''}
          ${obj.place?.name
            ? html`
                <span class="timeline-place"
                  ><mwc-icon class="person">place</mwc-icon> ${obj.place
                    .name}</span
                >
              `
            : ''}
          ${obj.person?.name_given || obj.person?.name_surname
            ? html`
                <span class="timeline-person"
                  ><mwc-icon class="person">person</mwc-icon> ${obj.person
                    ?.name_given || html`&hellip;`}
                  ${obj.person?.name_surname || html`&hellip;`}</span
                >
              `
            : ''}

          <span class="timeline-button">
            <mwc-button
              dense
              outlined
              label="${this._('Details')}"
              @click="${() => this._handleButtonClick(obj.gramps_id)}"
            >
            </mwc-button>
          </span>
        </div>
      </div>
    `
  }

  _handleMouseOver(obj) {
    const grampsId = obj.gramps_id
    const lat = obj?.place?.lat
    const long = obj?.place?.long
    this.highlightedId = grampsId
    if (lat || long) {
      const map = this.shadowRoot.getElementById('timeline-map')
      map.panTo(lat, long)
    }
  }

  _handleMapClick(e) {
    if (e.detail?.markerId) {
      this.highlightedId = e.detail.markerId
      this._scrollToId(`event-${e.detail.markerId}`)
      const lat = e.detail?.latitude
      const long = e.detail?.longitude
      if (lat || long) {
        const map = this.shadowRoot.getElementById('timeline-map')
        map.panTo(lat, long)
      }
    }
  }

  _handleButtonClick(grampsId) {
    this.dispatchEvent(
      new CustomEvent('nav', {
        bubbles: true,
        composed: true,
        detail: {
          path: `event/${grampsId}`,
        },
      })
    )
  }

  _scrollToId(eleId) {
    const ele = this.shadowRoot.getElementById(eleId)
    if (!ele) {
      return
    }
    ele.scrollIntoView({behavior: 'smooth', block: 'center'})
  }
}

window.customElements.define('grampsjs-person-timeline', GrampsjsPersonTimeline)
