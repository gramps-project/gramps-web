import {html, css, LitElement} from 'lit'

import '@material/web/iconbutton/icon-button.js'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'
import '@material/web/checkbox/checkbox'

import './GrampsjsIcon.js'
import {mdiLayers} from '@mdi/js'
import {fireEvent} from '../util.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsMapLayerSwitcher extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .map-layer-switcher md-icon-button {
          --md-icon-button-icon-size: 18px;
          width: 32px;
          height: 32px;
        }

        .map-layer-switcher md-menu-item {
          --md-menu-item-top-space: 0px;
          --md-menu-item-bottom-space: 0px;
          --md-menu-item-one-line-container-height: 40px;
          --md-menu-item-label-text-size: 15px;
        }

        .map-layer-switcher md-menu {
          --md-divider-thickness: 1px;
        }

        span.limit-width {
          max-width: min(40em, 80vw);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
    ]
  }

  static get properties() {
    return {
      overlays: {type: Array},
      currentStyle: {type: String},
    }
  }

  constructor() {
    super()
    this.overlays = []
    this.currentStyle = ''
  }

  render() {
    return html`
      <div
        class="map-layer-switcher"
        style="position: relative;
      width: fit-content;
      bottom: 46px;
      left: 10px;
      z-index: 1;
      background: var(--md-sys-color-surface-container-high);
      border-radius: 4px;
      box-shadow: 0 1px 4px var(--grampsjs-body-font-color-20);
      padding: 2px;
      font-size: 14px;
      display: flex;
      align-items: center;
      "
      >
        <md-icon-button id="layer-button" @click="${this._handleLayerClick}">
          <grampsjs-icon
            path="${mdiLayers}"
            color="var(--grampsjs-body-font-color-70)"
          ></grampsjs-icon>
        </md-icon-button>

        <md-menu
          id="layer-menu"
          anchor="layer-button"
          style="z-index: 1; position: relative;"
          positioning="popover"
        >
          <md-menu-item
            keepOpen
            value="base"
            ?selected=${this.currentStyle === 'base'}
            @click="${() => this._handleStyleChange('base')}"
          >
            <div slot="headline">
              <label
                ><md-radio
                  ?checked="${this.currentStyle === 'base'}"
                ></md-radio>
                ${this._('Base Map')}</label
              >
            </div>
          </md-menu-item>
          <md-menu-item
            value="ohm"
            keepOpen
            ?selected=${this.currentStyle === 'ohm'}
            @click="${() => this._handleStyleChange('ohm')}"
          >
            <div slot="headline">
              <label
                ><md-radio ?checked="${this.currentStyle === 'ohm'}"></md-radio>
                ${this._('Historical Map')}</label
              >
            </div>
          </md-menu-item>
          ${this.overlays.length === 0
            ? ''
            : html`
                <md-divider role="separator" tabindex="-1"></md-divider>
                ${this.overlays.map(
                  overlay => html`
                    <md-menu-item
                      keepOpen
                      value="${overlay.handle}"
                      ?selected="${overlay.visible}"
                    >
                      <div slot="headline">
                        <label>
                          <md-checkbox
                            ?checked="${overlay.visible}"
                            @change="${e =>
                              this._handleOverlayToggle(e, overlay)}"
                          ></md-checkbox>
                          <span class="limit-width">${overlay.desc}</span>
                        </label>
                      </div>
                    </md-menu-item>
                  `
                )}
              `}
        </md-menu>
      </div>
    `
  }

  _handleOverlayToggle(e, overlay) {
    fireEvent(this, 'map:overlay-toggle', {overlay, visible: e.target.checked})
  }

  _handleStyleChange(style) {
    fireEvent(this, 'map:layerchange', {style})
  }

  _handleLayerClick() {
    const menu = this.renderRoot.querySelector('#layer-menu')
    if (menu) {
      menu.open = !menu.open
    }
  }
}

window.customElements.define(
  'grampsjs-map-layer-switcher',
  GrampsjsMapLayerSwitcher
)
