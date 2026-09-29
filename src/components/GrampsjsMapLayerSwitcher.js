import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/web/iconbutton/icon-button.js'
import '@material/web/switch/switch.js'

import './GrampsjsIcon.js'
import './GrampsjsImg.js'
import {mdiLayers} from '@mdi/js'
import {fireEvent, objectIconPath} from '../util.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

const STYLE_BASE = 'base'
const STYLE_OHM = 'ohm'

// Thumbnails of the map styles, in images/. Each shows the same simplified
// piece of Paris in the colors of its style.
const THUMBNAILS = {
  base: 'images/map-style-base.svg',
  baseDark: 'images/map-style-base-dark.svg',
  ohm: 'images/map-style-historical.svg',
}

class GrampsjsMapLayerSwitcher extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        /* GrampsjsMap places the switcher; the panel is anchored to it. */
        :host {
          position: relative;
          display: block;
          width: fit-content;
        }

        .button {
          background: var(--md-sys-color-surface-container-high);
          border-radius: 12px;
          box-shadow: 0 1px 4px var(--grampsjs-body-font-color-20);
          padding: 2px;
          display: flex;
          align-items: center;
          position: relative;
        }

        /* Shown while any overlay is on. */
        .dot {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--md-sys-color-primary);
          box-shadow: 0 0 0 2px var(--md-sys-color-surface-container-high);
          pointer-events: none;
        }

        .button md-icon-button {
          --md-icon-button-icon-size: 18px;
          width: 32px;
          height: 32px;
        }

        #panel {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          width: 300px;
          max-height: calc(100vh - 260px);
          overflow-y: auto;
          box-sizing: border-box;
          padding: 12px;
          background: var(--md-sys-color-surface-container-high);
          color: var(--md-sys-color-on-surface);
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
          font-size: 14px;
        }

        .styles {
          display: flex;
          gap: 8px;
        }

        .style-card {
          flex: 1;
          min-width: 0;
          padding: 4px;
          border: 2px solid transparent;
          border-radius: 12px;
          background: none;
          color: inherit;
          font: inherit;
          cursor: pointer;
          text-align: left;
        }

        .style-card:hover {
          background: var(--md-sys-color-surface-container-highest);
        }

        .style-card.selected {
          border-color: var(--md-sys-color-primary);
        }

        .style-card img {
          display: block;
          width: 100%;
          height: 56px;
          object-fit: cover;
          border-radius: 8px;
        }

        .style-label {
          display: block;
          margin-top: 4px;
          font-size: 13px;
          font-weight: 500;
        }

        .style-year {
          display: block;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
        }

        h3 {
          margin: 16px 0 4px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--md-sys-color-on-surface-variant);
          font-family: var(--grampsjs-body-font-family);
        }

        .row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 0;
          cursor: pointer;
        }

        .lead {
          flex: none;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: var(--md-sys-color-surface-container-highest);
        }

        .lead grampsjs-img {
          width: 100%;
          height: 100%;
        }

        .swatch {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
        }

        .text {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sub {
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
        }

        md-switch {
          flex: none;
          --md-switch-track-height: 22px;
          --md-switch-track-width: 38px;
          --md-switch-handle-height: 16px;
          --md-switch-handle-width: 16px;
          --md-switch-selected-handle-height: 16px;
          --md-switch-selected-handle-width: 16px;
          --md-switch-pressed-handle-height: 18px;
          --md-switch-pressed-handle-width: 18px;
        }

        @media (max-width: 512px) {
          #panel {
            position: fixed;
            left: 8px;
            right: 8px;
            bottom: 8px;
            width: auto;
            max-height: 70vh;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      overlays: {type: Array},
      currentStyle: {type: String},
      year: {type: Number},
      _open: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.overlays = []
    this.currentStyle = ''
    this.year = -1
    this._open = false
    this._handleDocumentPointer = e => {
      if (!e.composedPath().includes(this)) this._open = false
    }
    this._handleDocumentKey = e => {
      if (e.key === 'Escape') this._open = false
    }
  }

  render() {
    return html`
      <div class="button">
        <md-icon-button
          id="layer-button"
          aria-label="${this._('Map')}"
          aria-expanded="${this._open}"
          aria-controls="panel"
          @click="${this._handleButtonClick}"
        >
          <grampsjs-icon
            path="${mdiLayers}"
            color="var(--grampsjs-body-font-color-70)"
          ></grampsjs-icon>
        </md-icon-button>
        ${this.overlays.some(overlay => overlay.visible)
          ? html`<span class="dot"></span>`
          : ''}
      </div>
      ${this._open ? this._renderPanel() : ''}
    `
  }

  _renderPanel() {
    const own = this.overlays.filter(overlay => overlay.group !== 'external')
    const external = this.overlays.filter(
      overlay => overlay.group === 'external'
    )
    return html`
      <div id="panel" role="dialog" aria-label="${this._('Map')}">
        <div class="styles">
          ${this._renderStyleCard(STYLE_BASE, this._('Base Map'))}
          ${this._renderStyleCard(STYLE_OHM, this._('Historical Map'))}
        </div>
        ${this._renderSection(this._('Your maps'), own)}
        ${this._renderSection(this._('External'), external)}
      </div>
    `
  }

  _renderStyleCard(style, label) {
    const selected = this.currentStyle === style
    const dark = this.appState?.getCurrentTheme?.() === 'dark'
    let thumbnail = THUMBNAILS.ohm
    if (style === STYLE_BASE) {
      thumbnail = dark ? THUMBNAILS.baseDark : THUMBNAILS.base
    }
    // The historical map shows the year of the time slider.
    const showYear = selected && style === STYLE_OHM && this.year > 0
    return html`
      <button
        class="${classMap({'style-card': true, selected})}"
        aria-pressed="${selected}"
        @click="${() => this._handleStyleChange(style)}"
      >
        <img src="${thumbnail}" alt="" />
        <span class="style-label">${label}</span>
        ${showYear ? html`<span class="style-year">${this.year}</span>` : ''}
      </button>
    `
  }

  _renderSection(title, overlays) {
    if (overlays.length === 0) return ''
    return html`
      <h3>${title}</h3>
      ${overlays.map(overlay => this._renderRow(overlay))}
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderLead(overlay) {
    if (overlay.thumbnail) {
      const {handle, checksum, mime} = overlay.thumbnail
      return html`<grampsjs-img
        handle="${handle}"
        checksum="${checksum ?? ''}"
        mime="${mime ?? ''}"
        size="40"
        square
        cover
        fallbackIcon="${objectIconPath.media}"
      ></grampsjs-img>`
    }
    if (overlay.color) {
      return html`<span
        class="swatch"
        style="background: ${overlay.color}"
      ></span>`
    }
    return ''
  }

  _renderRow(overlay) {
    const sub = overlay.visible ? overlay.status : ''
    return html`
      <label class="row">
        <span class="lead">${this._renderLead(overlay)}</span>
        <span class="text">
          <span class="title">${overlay.desc}</span>
          ${sub ? html`<span class="sub">${sub}</span>` : ''}
        </span>
        <md-switch
          ?selected="${overlay.visible}"
          @change="${e => this._handleOverlayToggle(e, overlay)}"
        ></md-switch>
      </label>
    `
  }

  updated(changed) {
    if (changed.has('_open')) {
      if (this._open) {
        document.addEventListener('pointerdown', this._handleDocumentPointer)
        document.addEventListener('keydown', this._handleDocumentKey)
      } else {
        this._removeDocumentListeners()
      }
    }
  }

  disconnectedCallback() {
    this._removeDocumentListeners()
    super.disconnectedCallback()
  }

  _removeDocumentListeners() {
    document.removeEventListener('pointerdown', this._handleDocumentPointer)
    document.removeEventListener('keydown', this._handleDocumentKey)
  }

  _handleButtonClick() {
    this._open = !this._open
  }

  _handleOverlayToggle(e, overlay) {
    fireEvent(this, 'map:overlay-toggle', {
      overlay,
      visible: e.target.selected,
    })
  }

  _handleStyleChange(style) {
    if (style === this.currentStyle) return
    fireEvent(this, 'map:layerchange', {style})
  }
}

window.customElements.define(
  'grampsjs-map-layer-switcher',
  GrampsjsMapLayerSwitcher
)
