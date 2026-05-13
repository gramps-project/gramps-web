import {LitElement, html, css} from 'lit'
import {mdiChevronRight} from '@mdi/js'
import './GrampsjsIcon.js'

export class GrampsjsCollapsibleSection extends LitElement {
  static get properties() {
    return {
      title: {type: String},
      description: {type: String},
      open: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.title = ''
    this.description = ''
    this.open = false
  }

  static get styles() {
    return css`
      summary {
        cursor: pointer;
        list-style: none;
        display: grid;
        grid-template-columns: 22px 1fr;
        grid-template-areas:
          'chevron title'
          '. description';
        column-gap: 0.4em;
        padding: 1.25em 0 0.75em;
        user-select: none;
      }

      summary::-webkit-details-marker {
        display: none;
      }

      summary::marker {
        display: none;
      }

      summary:hover {
        opacity: 0.8;
      }

      .chevron {
        grid-area: chevron;
        align-self: center;
        display: flex;
        align-items: center;
        transition: transform 0.2s ease;
      }

      details[open] .chevron {
        transform: rotate(90deg);
      }

      .title {
        grid-area: title;
        font-size: 1.5em;
        font-weight: 500;
      }

      .description {
        grid-area: description;
        font-size: 0.95em;
        color: var(--md-sys-color-on-surface-variant, currentColor);
        opacity: 0.75;
        margin-top: 0.1em;
      }

      .content {
        padding-left: calc(22px + 0.4em);
        padding-bottom: 1.25em;
      }
    `
  }

  render() {
    return html`
      <details ?open="${this.open}">
        <summary>
          <span class="chevron">
            <grampsjs-icon
              path="${mdiChevronRight}"
              height="22"
              color="var(--md-sys-color-on-surface)"
            ></grampsjs-icon>
          </span>
          <span class="title">${this.title}</span>
          ${this.description
            ? html`<span class="description">${this.description}</span>`
            : ''}
        </summary>
        <div class="content">
          <slot></slot>
        </div>
      </details>
    `
  }
}

window.customElements.define(
  'grampsjs-collapsible-section',
  GrampsjsCollapsibleSection
)
