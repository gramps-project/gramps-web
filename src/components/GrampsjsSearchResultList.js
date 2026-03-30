import {LitElement, css, html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/web/iconbutton/icon-button.js'
import './GrampsjsIcon.js'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'
import '@material/web/divider/divider.js'

import {
  objectDescription,
  fireEvent,
  objectDetail,
  renderIcon,
} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsJsImage.js'
import {sharedStyles} from '../SharedStyles.js'

export class GrampsjsSearchResultList extends GrampsjsAppStateMixin(
  LitElement
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-icon-button {
          --md-icon-button-icon-size: 20px;
        }

        grampsjs-icon[slot='start'] {
          background-color: var(--grampsjs-color-icon-background);
        }

        /* Replicate mwc-list-item graphic="avatar" sizing/rounding */
        grampsjs-img[slot='start'],
        grampsjs-icon[slot='start'] {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          overflow: hidden;
          border-radius: 50%;
          flex-shrink: 0;
        }

        md-list.activatable md-list-item:hover {
          background-color: var(
            --grampsjs-editable-list-hover-background-color,
            color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent)
          );
        }

        md-list.activatable md-list-item.selected {
          background-color: var(
            --grampsjs-editable-list-selected-background-color,
            color-mix(in srgb, var(--md-sys-color-primary) 12%, transparent)
          );
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      textEmpty: {type: String},
      activatable: {type: Boolean},
      _selectedIndex: {type: Number},
      selectable: {type: Boolean},
      linked: {type: Boolean},
      metaIcon: {type: String},
      date: {type: Boolean},
      noSep: {type: Boolean},
      loading: {type: Boolean},
      numberLoading: {type: Number},
      large: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = []
    this.textEmpty = ''
    this.activatable = false
    this._selectedIndex = -1
    this.selectable = false
    this.linked = false
    this.metaIcon = ''
    this.date = false
    this.noSep = false
    this.loading = false
    this.numberLoading = 2
    this.large = false
  }

  render() {
    if (this.loading) {
      return this.renderLoading()
    }
    return html`
      <md-list
        id="search-results"
        class="${classMap({activatable: this.activatable, large: this.large})}"
      >
        ${this.data.length === 0 && this.textEmpty
          ? html`
              <md-list-item type="text">
                <span>${this.textEmpty}</span>
              </md-list-item>
            `
          : ''}
        ${this.data.map((obj, i, arr) => {
          const desc = objectDescription(
            obj.object_type,
            obj.object,
            this.appState.i18n.strings
          )
          return html`
            <md-list-item
              type="${this.selectable || this.linked ? 'button' : 'text'}"
              class="${classMap({
                selected: this.activatable && i === this._selectedIndex,
              })}"
              @click="${() => this._handleClick(obj, i)}"
              @keydown="${this._handleKeyDown}"
            >
              ${renderIcon(obj, 'start')}
              ${this.metaIcon
                ? html`
                    <md-icon-button
                      @click="${e => this._handleMetaClick(e, obj)}"
                      slot="end"
                    >
                      <grampsjs-icon path="${this.metaIcon}"></grampsjs-icon>
                    </md-icon-button>
                  `
                : ''}
              ${obj.loading
                ? html`<span style="width:10em;" class="skeleton">&nbsp;</span>`
                : html`<span>${desc}</span>`}
              ${obj.loading
                ? html`<span
                    slot="supporting-text"
                    style="width:10em;"
                    class="skeleton"
                    >&nbsp;</span
                  >`
                : html`<span slot="supporting-text"
                    >${this._renderSecondary(obj)}</span
                  >`}
            </md-list-item>
            ${!this.noSep && arr.length - 1 !== i
              ? html`<md-divider></md-divider>`
              : ''}
          `
        }, this)}
      </md-list>
    `
  }

  renderLoading() {
    return html`
      <md-list>
        ${Array(this.numberLoading).fill(
          html`
            <md-list-item type="text">
              <span class="skeleton" style="width:15em;">&nbsp;</span>
              <span slot="supporting-text" class="skeleton" style="width:10em;"
                >&nbsp;</span
              >
              <span slot="start" class="skeleton avatar">&nbsp;</span>
            </md-list-item>
          `
        )}
      </md-list>
    `
  }

  _renderSecondary(obj) {
    if (this.date && obj.object?.change) {
      return html`<grampsjs-timedelta
        timestamp="${obj.object.change}"
        locale="${this.appState.i18n.lang}"
      ></grampsjs-timedelta>`
    }
    const detail = objectDetail(
      obj.object_type,
      obj.object,
      this.appState.i18n.strings
    ).trim()
    if (detail?.length) {
      return detail
    }
    return obj.object_type === 'tag'
      ? this._('Tag')
      : obj.object?.gramps_id || '...'
  }

  _handleMetaClick(e, obj) {
    e.preventDefault()
    e.stopPropagation()
    fireEvent(this, 'search-result:metaClicked', {
      ...obj,
      sourceElement: e.currentTarget,
    })
  }

  _handleClick(obj, i) {
    if (this.activatable) {
      this._selectedIndex = i
      fireEvent(this, 'action', {index: i})
    }
    if (this.linked && obj.object_type && obj.object?.gramps_id) {
      const path = `${obj.object_type}/${obj.object?.gramps_id}`
      fireEvent(this, 'nav', {path})
    }
    fireEvent(this, 'search-result:clicked', obj)
  }

  // eslint-disable-next-line class-methods-use-this
  _handleKeyDown(event) {
    if (event.code === 'Enter') {
      event.target.click()
      event.preventDefault()
      event.stopPropagation()
    }
  }
}

window.customElements.define(
  'grampsjs-search-result-list',
  GrampsjsSearchResultList
)
