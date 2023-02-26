import '@material/mwc-circular-progress'
import '@material/mwc-list'

import {html, LitElement} from 'lit'
import {mdiMapMarker} from '@mdi/js'

import {Marker, Icon} from '../../node_modules/leaflet/dist/leaflet-src.esm.js'
import {iconDataUrl} from '../icons.js'
import {apiGet} from '../api.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

const EVENT_ICONS = {
  Birth: '*',
  Death: '†',
  Marriage: 'join_full',
}

class GrampsjsMapMarker extends GrampsjsTranslateMixin(LitElement) {
  render() {
    return html` <link rel="stylesheet" href="leaflet.css" /> `
  }

  static get properties() {
    return {
      placeData: {type: Object},
      markerId: {type: String},
      opacity: {type: Number},
      size: {type: Number},
      _marker: {type: Object, attribute: false},
      _map: {type: Object, attribute: false},
    }
  }

  constructor() {
    super()
    this.popupLabel = ''
    this.markerId = ''
    this.opacity = 1
    this.size = 32
  }

  attributeChangedCallback(name, oldval, newval) {
    super.attributeChangedCallback(name, oldval, newval)
    this.updateMarker()
  }

  firstUpdated() {
    this._map = this.parentElement._map
    this.addMarker()
  }

  addMarker() {
    const icon = new Icon({
      iconUrl: iconDataUrl(mdiMapMarker, '#EA4335'),
      iconSize: [this.size, this.size],
      iconAnchor: [this.size / 2, this.size],
      popupAnchor: [0, -this.size],
    })
    this._marker = new Marker(
      [this.placeData.profile.lat, this.placeData.profile.long],
      {
        opacity: this.opacity,
        icon,
      }
    )
    this._marker.addTo(this._map)
    this._marker.on('dblclick', this.clickHandler.bind(this))
    this._marker.on('click', this.popupLoader.bind(this))
    this.popupHeader = `
      <a href='place/${this.placeData.profile.gramps_id}'>
        <h1 style='display:inline-block;text-decoration:underline;vertical-align:top;'>
          ${this.placeData.profile.name}
        </h1>
      </a>
      ${
        this.placeData.profile.parent_places?.length > 0 &&
        `<br />
          <h2>
            ${this.placeData.profile.parent_places
              .map(
                place => `<a href='place/${place.gramps_id}'>${place.name}</a>`
              )
              .join(', ')}
          </h2>
        `
      }
    `
    this._marker.bindPopup(this.popupHeader, {maxWidth: 360})
  }

  clickHandler() {
    this.dispatchEvent(
      new CustomEvent('marker:clicked', {
        bubbles: true,
        composed: true,
        detail: {
          latitude: this.placeData.profile.lat,
          longitude: this.placeData.profile.long,
          markerId: this.markerId,
        },
      })
    )
  }

  popupLoader(event) {
    const popup = event.target.getPopup()

    // Add a spinner to the end of the popup while we get more detailed place data
    popup.setContent(
      `${this.popupHeader}<mwc-circular-progress indeterminate />`
    )

    // URL for more detailed place data
    const url = `/api/places/?gramps_id=${
      this.placeData.profile.gramps_id
    }&backlinks=true&extend=all&locale=${
      this.strings?.__lang__ || 'en'
    }&profile=all`

    // Fetch more detailed data and then update the popup content again
    apiGet(url).then(result => {
      const content = GrampsjsMapMarker.renderPopup(this.popupHeader, result)
      popup.setContent(content)
    })
  }

  static renderPopup(header, placesResult) {
    const extendedLocationData = placesResult?.data?.[0]
    const extendedContent = placesResult?.data?.[0]?.extended
    let content = header
    // add notes
    if (extendedContent?.notes?.length > 0) {
      content += extendedContent.notes
        .map(note => `<p>${note?.text?.string}</p>`)
        .join('')
    }
    // add events
    content += GrampsjsMapMarker.renderEvents(extendedLocationData)
    // Prepend with a image if present
    if (extendedContent?.media?.length > 0) {
      const imgData = extendedContent.media[0]
      content = `
        <grampsjs-img
          handle="${imgData.handle}"
          size="64"
          displayHeight="64"
          .rect="${[]}"
          square
          circle
          mime="${imgData.mime}"
        ></grampsjs-img>
      ${content}`
    }
    return content
  }

  static renderEvents(extendedLocationData) {
    if (extendedLocationData?.profile?.references?.event?.length > 0) {
      return `
        <hr style="min-width:360px" />
        <mwc-list style="max-height:180px;overflow-y:auto">
          ${extendedLocationData.profile.references.event
            .sort((eventA, eventB) => eventA.date.localeCompare(eventB.date))
            .map((eventData, index) =>
              GrampsjsMapMarker.renderEvent(
                eventData,
                extendedLocationData.extended?.backlinks?.event?.[index]
                  ?.gramps_id
              )
            )
            .join('')}</mwc-list>`
    }
    return ''
  }

  static renderEvent(eventData, grampsId) {
    const icon = EVENT_ICONS[eventData.type] ?? 'event'

    return `<a href="/event/${grampsId}" style="text-decoration:none">
      <mwc-list-item twoline graphic="avatar" title="${eventData.summary}">
        <span>${eventData.summary}</span>
        <span slot="secondary">${eventData.date || '~'}</span>
        <mwc-icon slot="graphic">${icon}</mwc-icon>
      </mwc-list-item>
    </a>`
  }

  disconnectedCallback() {
    this._map.removeLayer(this._marker)
    super.disconnectedCallback()
  }

  updateMarker() {
    if (this._marker) {
      this._map.removeLayer(this._marker)
      this.addMarker()
    }
  }
}

window.customElements.define('grampsjs-map-marker', GrampsjsMapMarker)
