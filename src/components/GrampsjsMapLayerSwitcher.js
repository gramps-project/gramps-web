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
      background: white;
      border-radius: 4px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
      padding: 2px;
      font-size: 14px;
      display: flex;
      align-items: center;
      "
      >
        <md-icon-button id="layer-button" @click="${this._handleLayerClick}">
          <grampsjs-icon path="${mdiLayers}" color="#555"></grampsjs-icon>
        </md-icon-button>

        <md-menu
          id="layer-menu"
          anchor="layer-button"
          style="z-index: 1; position: relative;"
          positioning="popover"
        >
          <md-menu-item
            value="ohm"
            keepOpen
            ?selected=${this.currentStyle === 'ohm'}
            @click="${() => this._handleStyleChange('ohm')}"
          >
            <div slot="headline">
              <label
                ><md-radio ?checked="${this.currentStyle === 'ohm'}"></md-radio>
                OpenHistoricalMap</label
              >
            </div>
          </md-menu-item>
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
          ${true // TODO
            ? ''
            : html`
                <md-divider role="separator" tabindex="-1"></md-divider>
                ${this.overlays.map(
                  overlay => html`
                    <md-menu-item
                      keepOpen
                      value="${overlay.handle}"
                      ?selected="${overlay.visible}"
                      @click="${() => {
                        fireEvent(this, 'map:overlay-toggle', {
                          overlay: overlay.handle,
                          visible: overlay.visible,
                        })
                      }}"
                    >
                      <div slot="headline">
                        <label>
                          <md-checkbox
                            ?checked="${overlay.visible}"
                            @change="${() => {
                              fireEvent(this, 'map:overlay-toggle', {
                                handle: overlay.handle,
                                visible: overlay.visible,
                              })
                            }}"
                          ></md-checkbox>
                          ${overlay.desc}
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
