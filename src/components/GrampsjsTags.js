import {LitElement, css, html} from 'lit'

import {hex6ToCss, hex12ToCss} from '../color.js'
import {sharedStyles} from '../SharedStyles.js'
import '@material/web/chips/chip-set'
import '@material/web/chips/input-chip'
import '@material/web/chips/assist-chip'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/icon/icon.js'
import {mdiTagPlus} from '@mdi/js'

import {fireEvent} from '../util.js'
import './GrampsjsFormNewTag.js'
import './GrampsjsIcon.js'
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
          color: var(--grampsjs-body-font-color-50);
          margin-top: 15px;
          margin-bottom: 7px;
        }

        .tags {
          clear: left;
          margin-bottom: 15px;
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 5px 0px;
        }

        md-input-chip {
          --md-input-chip-container-color: var(--tag-color-bg);
          --md-input-chip-label-text-color: var(--tag-color);
          --md-input-chip-outline-color: var(--tag-color);
          --md-input-chip-icon-color: var(--tag-color);
          --md-input-chip-trailing-icon-color: var(--tag-color);
          --md-input-chip-hover-label-text-color: var(--tag-color);
          --md-input-chip-hover-trailing-icon-color: var(--tag-color);
          --md-input-chip-hover-icon-color: var(--tag-color);
          --md-input-chip-hover-outline-color: var(--tag-color);
          --md-input-chip-focus-label-text-color: var(--tag-color);
          --md-input-chip-focus-trailing-icon-color: var(--tag-color);
          --md-input-chip-focus-icon-color: var(--tag-color);
          --md-input-chip-focus-outline-color: var(--tag-color);
          --md-input-chip-pressed-label-text-color: var(--tag-color);
          --md-input-chip-pressed-trailing-icon-color: var(--tag-color);
          --md-input-chip-pressed-icon-color: var(--tag-color);
        }

        md-assist-chip {
          --md-assist-chip-container-color: var(--tag-color-bg);
          --md-assist-chip-label-text-color: var(--tag-color);
          --md-assist-chip-outline-color: var(--tag-color);
          --md-assist-chip-hover-label-text-color: var(--tag-color);
          --md-assist-chip-hover-outline-color: var(--tag-color);
          --md-assist-chip-focus-label-text-color: var(--tag-color);
          --md-assist-chip-focus-outline-color: var(--tag-color);
          --md-assist-chip-pressed-label-text-color: var(--tag-color);
        }

        md-icon-button {
          --md-icon-button-icon-size: 20px;
          --md-icon-button-state-layer-height: 32px;
          --md-icon-button-state-layer-width: 32px;
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

  _colorToCss(color, a) {
    return (
      (color?.length > 7 ? hex12ToCss(color, a) : hex6ToCss(color, a)) ??
      `rgba(0,0,0,${a})`
    )
  }

  render() {
    if (Object.keys(this.data).length === 0 && !this.edit) {
      return html``
    }
    return html`
      <h4>${this._('Tags')}</h4>
      <div class="tags">
        <md-chip-set>
          ${this.data
            .filter(obj => !this.hideTags.includes(obj.name))
            .map(obj =>
              this.edit
                ? html`<md-input-chip
                    label="${obj.name}"
                    style="--tag-color:${this._colorToCss(
                      obj.color,
                      0.9
                    )};--tag-color-bg:${this._colorToCss(obj.color, 0.12)}"
                    @remove=${e => {
                      e.preventDefault()
                      this._handleClear(obj.handle)
                    }}
                  ></md-input-chip>`
                : html`<md-assist-chip
                    label="${obj.name}"
                    style="--tag-color:${this._colorToCss(
                      obj.color,
                      0.9
                    )};--tag-color-bg:${this._colorToCss(obj.color, 0.12)}"
                  ></md-assist-chip>`
            )}
        </md-chip-set>
        ${this.edit
          ? html`
              <md-icon-button
                id="btn-tag"
                class="edit"
                @click="${this._handleNewTag}"
              >
                <grampsjs-icon
                  path="${mdiTagPlus}"
                  color="var(--grampsjs-body-font-color-35)"
                ></grampsjs-icon>
              </md-icon-button>
              <grampsjs-tooltip for="btn-tag" .appState="${this.appState}"
                >${this._('Add Tag')}</grampsjs-tooltip
              >
            `
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
