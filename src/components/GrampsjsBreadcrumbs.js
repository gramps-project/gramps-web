import {LitElement, html, css} from 'lit'

import '@material/mwc-icon-button'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent, clickKeyHandler} from '../util.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import './GrampsjsTooltip.js'

export class GrampsjsBreadcrumbs extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .breadcrumb {
          font-size: 14px;
          font-weight: 450;
          color: rgba(0, 0, 0, 0.45);
          margin-bottom: 18px;
        }

        .breadcrumb a:link,
        a:visited {
          color: rgba(0, 0, 0, 0.45);
          text-decoration: none;
          border-radius: 3px;
          padding: 4px 7px;
        }

        .breadcrumb a:hover {
          color: rgba(0, 0, 0, 0.45);
          text-decoration: none;
          background-color: rgba(0, 0, 0, 0.05);
        }

        .breadcrumb .dark {
        }

        .breadcrumb mwc-icon {
          font-size: 18px;
          top: 4px;
          position: relative;
          color: rgba(0, 0, 0, 0.4);
        }

        .breadcrumb .action-buttons {
          margin-left: 1rem;
          // float: right;
        }

        .breadcrumb .action-buttons mwc-icon-button {
          --mdc-icon-size: 16px;
          --mdc-icon-button-size: 28px;
          position: relative;
          top: -3px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      edit: {type: Boolean},
      objectsName: {type: String},
      objectIcon: {type: String},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.edit = false
    this.objectsName = ''
    this.objectIcon = ''
  }

  render() {
    return html`
      <div class="breadcrumb">
        <mwc-icon>${this.objectIcon}</mwc-icon>
        <a href="/${this._getObjectsLink()}">${this._(this.objectsName)}</a>
        <mwc-icon>chevron_right</mwc-icon>
        <span class="dark">${this.data.gramps_id}</span>
        <span class="action-buttons">
          <span id="wrap-btn-private">
            <mwc-icon-button
              icon="${this.data.private ? 'lock_outline' : 'lock_open'}"
              ?disabled="${!this.edit}"
              @click="${this._handlePrivacyClick}"
              @keydown="${clickKeyHandler}"
              class="edit"
              id="btn-private"
            ></mwc-icon-button>
          </span>

          <grampsjs-tooltip
            for="wrap-btn-private"
            content="${this.data.private
              ? this._('Record is private')
              : this._('Record is public')}"
          ></grampsjs-tooltip>

          <mwc-icon-button
            id="share-icon"
            icon="share"
            @click="${this._handleShareClick}"
            @keydown="${clickKeyHandler}"
          ></mwc-icon-button>
          <grampsjs-tooltip for="share-icon"
            >${this._('Copy URL')}</grampsjs-tooltip
          >
        </span>
      </div>
    `
  }

  _getObjectsLink() {
    // Media Objects -> /medialist
    if (this.objectsName === 'Media Objects') {
      return 'medialist'
    }
    // People -> /people etc.
    return this.objectsName.toLowerCase()
  }

  _handlePrivacyClick() {
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {private: !this.data.private},
    })
  }

  _handleShareClick() {
    const url = document.URL
    if (navigator.share) {
      navigator.share({url})
    } else {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      navigator.clipboard.writeText(url).finally(() => {
        document.body.removeChild(input)
      })
      const btn = this.renderRoot.getElementById('share-icon')
      btn.icon = 'done'
      setTimeout(() => {
        btn.icon = 'share'
      }, 1000)
    }
  }
}

window.customElements.define('grampsjs-breadcrumbs', GrampsjsBreadcrumbs)
