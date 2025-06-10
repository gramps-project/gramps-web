import {LitElement, css, html} from 'lit'

import {hex6ToCss} from '../color.js'
import {sharedStyles} from '../SharedStyles.js'
import '@material/mwc-icon-button'

import {fireEvent} from '../util.js'
import './GrampsjsFormNewTag.js'
import './GrampsjsTooltip.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsTags extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        h4 {
          font-weight: 400;
          font-size: 14px;
          font-family: var(--grampsjs-heading-font-family);
          color: rgba(0, 0, 0, 0.5);
          margin-top: 15px;
          margin-bottom: 7px;
        }

        .chip {
          font-size: 14px;
          font-weight: 400;
          font-family: var(--grampsjs-body-font-family);
          padding: 8px 12px;
          border-radius: 8px;
          margin: 5px 10px 5px 0px;
          border-width: 1px;
          border-style: solid;
        }

        .tags {
          clear: left;
          margin-bottom: 15px;
          align-items: center;
          display: inline-flex;
          padding: 5px 0px;
        }

        .chip mwc-icon-button {
          --mdc-icon-size: 14px;
          --mdc-icon-button-size: 18px;
        }

        .newtag {
          padding: 6px 12px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      edit: {type: Boolean},
      hideTags: {type: Array},
    }
  }

  constructor() {
    super()
    this.data = []
    this.edit = false
    this.hideTags = []
  }

  render() {
    if (Object.keys(this.data).length === 0 && !this.edit) {
      return html``
    }
    return html`
      <h4>${this._('Tags')}</h4>
      <div class="tags">
        ${this.data
          .filter(obj => !this.hideTags.includes(obj.name))
          .map(
            obj => html`
              <span
                class="chip"
                style="border-color:${hex6ToCss(
                  obj.color,
                  0.9
                )};color:${hex6ToCss(obj.color, 0.9)};"
                >${obj.name}${this.edit
                  ? html` <mwc-icon-button
                      icon="clear"
                      @click=${() => this._handleClear(obj.handle)}
                    ></mwc-icon-button>`
                  : ''}</span
              >
            `
          )}
        ${this.edit
          ? html` <span class="newtag">
              <mwc-icon-button
                icon="new_label"
                id="btn-tag"
                class="edit"
                @click="${this._handleNewTag}"
              ></mwc-icon-button>
              <grampsjs-tooltip for="btn-tag" .appState="${this.appState}"
                >${this._('Add Tag')}</grampsjs-tooltip
              >
            </span>`
          : ''}
      </div>
    `
  }

  _handleNewTag() {
    fireEvent(this, 'tag:new')
  }

  _handleList() {
    return this.data.map(_obj => _obj.handle)
  }

  _handleClear(handle) {
    const handles = this._handleList().filter(h => h !== handle)
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {tag_list: handles},
    })
  }
}

window.customElements.define('grampsjs-tags', GrampsjsTags)
