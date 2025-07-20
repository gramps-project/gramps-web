import {LitElement, html, css} from 'lit'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsObjectToc extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-list.toc-list {
          --md-list-item-label-text-weight: 400;
          --md-list-item-label-text-size: 14px;
          --md-list-item-label-text-color: var(
            --md-sys-color-on-surface-variant
          );
          --md-list-item-hover-state-layer-color: var(--md-sys-color-surface);
          --md-list-item-top-space: 0px;
          --md-list-item-bottom-space: 0px;
          --md-list-item-one-line-container-height: 40px;
        }

        md-list-item.active {
          --md-list-item-label-text-weight: 600;
        }

        h3 {
          margin-left: 14px;
          margin-bottom: 12px;
          margin-top: 0;
          font-size: 16px;
          font-weight: 420;
          opacity: 0.55;
        }
      `,
    ]
  }

  static get properties() {
    return {
      tabs: {type: Object},
      activeSection: {type: String},
      heading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.tabs = {}
    this.activeSection = ''
    this.heading = false
  }

  render() {
    const tabKeys = Object.keys(this.tabs)
    if (tabKeys.length <= 1) {
      return html`` // Don't show TOC if there's only one section
    }

    return html`
      ${this.heading ? html`<h3>${this._('Table Of Contents')}</h3>` : ''}
      <md-list class="toc-list">
        ${tabKeys.map(
          key => html`
            <md-list-item
              type="button"
              id="toc-item-${key}"
              class="${key === this.activeSection ? 'active' : ''}"
              @click="${e => this._handleItemClick(e, key)}"
            >
              ${this._(this.tabs[key].title)}
            </md-list-item>
          `
        )}
      </md-list>
    `
  }

  setActiveSection(sectionKey) {
    this.activeSection = sectionKey
  }

  _handleItemClick(e, sectionKey) {
    e.preventDefault()
    e.stopPropagation()

    this.activeSection = sectionKey

    this.dispatchEvent(
      new CustomEvent('toc-item-click', {
        detail: {
          sectionKey,
        },
        bubbles: true,
        composed: true,
      })
    )
  }
}

customElements.define('grampsjs-object-toc', GrampsjsObjectToc)
