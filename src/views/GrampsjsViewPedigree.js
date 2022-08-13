import { html, css } from 'lit';
import '@material/mwc-slider';
import '@material/mwc-button';
import '@material/mwc-icon';

import { GrampsjsView } from './GrampsjsView.js';
import '../components/GrampsjsPedigree.js';
import { apiGet } from '../api.js';
import { fireEvent } from '../util.js';

const BASE_DIR = '';

export class GrampsjsViewPedigree extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        mwc-slider {
          --mdc-theme-secondary: #4fc3f7;
        }

        #button-block {
          float: left;
          position: relative;
          top: 10px;
        }

        #pedigree-container {
          clear: left;
        }

        mwc-button {
          --mdc-ripple-focus-opacity: 0;
          --mdc-theme-primary: rgba(0, 0, 0, 0.7);
        }

        #outer-container {
          clear: left;
          padding-top: 30px;
          padding-left: 30px;
        }

        #controls {
          z-index: 1;
          position: absolute;
          top: 85px;
          left: 15px;
          border-radius: 5px;
          background-color: rgba(255, 255, 255, 0.9);
        }

        #controls mwc-icon-button {
          color: rgba(0, 0, 0, 0.3);
          --mdc-icon-size: 26px;
          --mdc-theme-text-disabled-on-light: rgba(0, 0, 0, 0.1);
        }

        #menu-controls mwc-list-item {
          --mdc-ripple-color: transparent;
        }

        mwc-slider {
          padding: 15px;
          padding-top: 50px;
        }

        mwc-list-item.slider {
          --mdc-menu-item-height: 70px;
        }
      `,
    ];
  }

  static get properties() {
    return {
      grampsId: { type: String },
      disableBack: { type: Boolean },
      disableHome: { type: Boolean },
      _data: { type: Array },
      _depth: { type: Number },
      _zoom: { type: Number },
      _history: { type: Array },
    };
  }

  constructor() {
    super();
    this.grampsId = '';
    this.disableBack = false;
    this.disableHome = false;
    this._data = [];
    this._depth = 3;
    this._zoom = 1;
    this._history = [];
  }

  renderContent() {
    if (this.grampsId === '') {
      // This should actually never happen, so don't bother translating!
      return html`
        No home person selected. <a href="${BASE_DIR}/settings">Settings</a>
        ${this._renderControls()}
      `;
    }
    if (this._data.length === 0) {
      return html` ${this._renderControls()} `;
    }
    return html`
      <section id="pedigree-section">
        <div id="outer-container">
          <div
            style="transform: scale(${this._zoom}); transform-origin: top left;"
            id="pedigree-container"
          >
            <grampsjs-pedigree
              .people="${this._data}"
              grampsId="${this.grampsId}"
              depth="${this._depth}"
              id="pedigree"
            ></grampsjs-pedigree>
          </div>
        </div>

        ${this._renderControls()}
      </section>
    `;
  }

  _renderControls() {
    return html` <div id="controls">
      <div>
        <mwc-icon-button
          icon="home"
          @click=${this._backToHomePerson}
          ?disabled="${this.disableHome}"
          style="margin-bottom:-10px;"
        ></mwc-icon-button>
      </div>
      <div>
        <mwc-icon-button
          icon="arrow_back"
          @click=${this._prevPerson}
          ?disabled=${this.disableBack}
          style="margin-bottom:-10px;"
        ></mwc-icon-button>
      </div>
      <div>
        <mwc-icon-button
          icon="settings"
          id="btn-controls"
          @click=${this._openMenuControls}
        ></mwc-icon-button>
        <mwc-menu
          id="menu-controls"
          corner="BOTTOM_RIGHT"
          menuCorner="START"
          defaultFocus="NONE"
        >
          <mwc-list-item noninteractive>
            ${this._('Number of generations:')}
          </mwc-list-item>
          <mwc-list-item class="slider">
            <mwc-slider
              value="${this._depth}"
              min="2"
              max="6"
              step="1"
              @change="${this._updateDepth}"
              pin
            ></mwc-slider>
          </mwc-list-item>
        </mwc-menu>
      </div>
    </div>`;
  }

  _openMenuControls() {
    const menu = this.shadowRoot.getElementById('menu-controls');
    menu.open = true;
  }

  _backToHomePerson() {
    fireEvent(this, 'tree:home');
  }

  _prevPerson() {
    fireEvent(this, 'tree:back');
  }

  update(changed) {
    super.update(changed);
    if (changed.has('grampsId')) {
      this._fetchData(this.grampsId);
      // this._history.push(this.grampsId)
      // limit history to 100 people
      // this._history = this._history.slice(-100)
    }
    if (changed.has('_depth')) {
      this.setZoom();
      this._fetchData(this.grampsId);
    }
    if (changed.has('active')) {
      this.setZoom();
      const slider = this.shadowRoot.getElementById('slider');
      if (slider) {
        slider.layout();
      }
    }
  }

  async _fetchData(grampsId) {
    this.loading = true;
    const rules = {
      function: 'or',
      rules: [
        {
          name: 'IsLessThanNthGenerationAncestorOf',
          values: [grampsId, this._depth || 1],
        },
        {
          name: 'IsLessThanNthGenerationDescendantOf',
          values: [grampsId, 1],
        },
      ],
    };
    const data = await apiGet(
      `/api/people/?rules=${encodeURIComponent(JSON.stringify(rules))}&locale=${
        this.strings?.__lang__ || 'en'
      }&profile=self,families`
    );
    this.loading = false;
    if ('data' in data) {
      this.error = false;
      this._data = data.data;
    } else if ('error' in data) {
      this.error = true;
      this._errorMessage = data.error;
    }
  }

  _updateDepth(event) {
    if (event.detail.value) {
      this._depth = event.detail.value;
    }
  }

  getZoom() {
    const sec = this.shadowRoot.getElementById('pedigree-section');
    if (sec === null) {
      return 1;
    }
    const secWidth = sec.offsetWidth;
    const treeWidth = this._depth * 230 * this._zoom;
    const newZoom = ((secWidth - 24) / treeWidth) * this._zoom;
    if (newZoom > 1) {
      return 1;
    }
    if (newZoom < 0.2) {
      return 0.2;
    }
    return newZoom;
  }

  setZoom() {
    this._zoom = this.getZoom();
  }

  _resizeHandler() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(this.setZoom.bind(this), 250);
  }

  firstUpdated() {
    window.addEventListener('resize', this._resizeHandler.bind(this));
    // window.addEventListener('pedigree:person-selected', this._selectPerson.bind(this))
    this.setZoom();
    this._fetchData(this.grampsId);
    const btn = this.shadowRoot.getElementById('btn-controls');
    const menu = this.shadowRoot.getElementById('menu-controls');
    menu.anchor = btn;
  }

  async _selectPerson(event) {
    const { grampsId } = event.detail;
    await this._fetchData(grampsId);
    this.grampsId = grampsId;
  }
}

window.customElements.define('grampsjs-view-pedigree', GrampsjsViewPedigree);
