import {LitElement, css, html} from 'lit'

import {hex6ToCss} from '../color.js'
import {sharedStyles} from '../SharedStyles.js'
import '@material/mwc-icon-button'

import {fireEvent} from '../util.js'
import './GrampsjsFormNewTag.js'
import './GrampsjsTooltip.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

export class GrampsjsTags extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .chip {
          font-size: 14px;
          font-weight: 400;
          font-family: var(--grampsjs-body-font-family);
          padding: 6px 12px;
          border-radius: 9999px;
          margin: 5px 5px;
          border-width: 1px;
          border-style: solid;
        }

        .tags {
          clear: left;
          margin: 15px 0px;
          align-items: center;
          display: inline-flex;
          padding: 5px;
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
              <grampsjs-tooltip for="btn-tag" .strings="${this.strings}"
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
