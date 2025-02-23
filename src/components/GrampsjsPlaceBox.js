import {html, css, LitElement} from 'lit'

import '@material/mwc-icon'
import '@material/mwc-button'

import './GrampsJsImage.js'
import './GrampsjsConnectedGallery.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import {sharedStyles} from '../SharedStyles.js'

export class GrampsjsPlaceBox extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        h2,
        h3,
        h4 {
          font-family: var(--grampsjs-body-font-family);
        }

        h2 {
          font-weight: 400;
          font-size: 22px;
          margin-top: 10px;
        }

        h3 {
          font-weight: 400;
          font-size: 18px;
          margin-bottom: 5px;
          margin-bottom: 7px;
        }

        h4 {
          margin-top: 2px;
          font-weight: 300;
          font-size: 15px;
        }

        :host {
          font-size: 16px;
        }

        .right {
          text-align: right;
        }

        #banner {
          background-color: red;
          height: 150px;
          width: 302px;
          margin-top: -15px;
          margin-left: -20px;
          position: relative;
        }

        p {
          margin-top: 0.6em;
          margin-bottom: 0.6em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = {}
  }

  render() {
    return html`
    <h2>
      ${this.data?.name?.value || this.data.title || this._('Place')}
      ${
        this.data?.profile?.parent_places.length > 0
          ? html`<h4>
              ${this.data.profile.parent_places.map(obj => obj.name).join(', ')}
            </h4>`
          : ''
      }
          </h4>

    ${
      this.data?.media_list?.length
        ? html`
            <h3>${this._('Gallery')}</h3>

            <grampsjs-connected-gallery
              .appState="${this.appState}"
              handle=${this.data.handle}
              objectType="place"
              square
              size="95"
              radius="7"
              count="${this.data?.media_list?.length || 1}"
            ></grampsjs-connected-gallery>
          `
        : ''
    }

    <div class="right">
      <mwc-button
        @click="${this._handleDetailClick}"
      >${this._('Show Details')}</mwc-button>
    </div>
    `
  }

  _handleDetailClick() {
    fireEvent(this, 'nav', {path: `place/${this.data.gramps_id}`})
  }
}

window.customElements.define('grampsjs-place-box', GrampsjsPlaceBox)
