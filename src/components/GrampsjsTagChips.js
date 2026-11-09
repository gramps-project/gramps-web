import {LitElement, css, html} from 'lit'
import {mdiTagOutline} from '@mdi/js'

import {tagColorToCss} from '../color.js'

/* Compact, read-only tag chips for table cells and list rows: a smaller
version of the outlined chips on the object page, with label and outline in
the tag colour.

Tags are sorted by their Gramps priority. At most `max` chips are shown,
followed by a "+N" chip listing the rest in its tooltip. On narrow screens,
a single chip with the number of tags is shown instead. With `expanded`, all
tags are shown at any width. */
export class GrampsjsTagChips extends LitElement {
  static get styles() {
    return css`
      :host {
        display: inline-flex;
        vertical-align: middle;
        max-width: 100%;
      }

      .chips {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      .chip {
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 24px;
        padding: 0 8px;
        border-radius: 8px;
        border: 1px solid var(--tag-color);
        color: var(--tag-color);
        font-family: var(--grampsjs-body-font-family);
        font-size: 12px;
        font-weight: 500;
        line-height: 22px;
        white-space: nowrap;
        min-width: 0;
      }

      :host([dense]) .chip {
        height: 20px;
        line-height: 18px;
        padding: 0 6px;
        border-radius: 6px;
      }

      .name {
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 12em;
      }

      .chip.neutral {
        --tag-color: var(--grampsjs-body-font-color-60);
        border-color: var(--md-sys-color-outline-variant);
      }

      .chip svg {
        flex: none;
        width: 14px;
        height: 14px;
      }

      .count {
        display: none;
      }

      /* read by screen readers, which cannot see the title tooltips */
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        white-space: nowrap;
      }

      :host([expanded]) .chips {
        flex-wrap: wrap;
      }

      @media (max-width: 600px) {
        :host(:not([expanded])) .chips {
          display: none;
        }

        :host(:not([expanded])) .count {
          display: inline-flex;
        }
      }
    `
  }

  static get properties() {
    return {
      data: {type: Array},
      max: {type: Number},
      dense: {type: Boolean, reflect: true},
      expanded: {type: Boolean, reflect: true},
    }
  }

  constructor() {
    super()
    this.data = []
    this.max = 2
    this.dense = false
    this.expanded = false
  }

  get _sortedTags() {
    return [...(this.data ?? [])]
      .filter(tag => tag?.name)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
  }

  render() {
    const tags = this._sortedTags
    if (tags.length === 0) {
      return ''
    }
    const max = this.expanded ? tags.length : this.max
    const shown = tags.slice(0, max)
    const rest = tags.slice(max)
    const restNames = rest.map(tag => tag.name).join(', ')
    const allNames = tags.map(tag => tag.name).join(', ')
    return html`
      <span class="chips">
        ${shown.map(
          tag => html`<span
            class="chip"
            title="${tag.name}"
            style="--tag-color:${tagColorToCss(tag.color)}"
            ><span class="name">${tag.name}</span></span
          >`
        )}
        ${rest.length > 0
          ? html`<span class="chip neutral" title="${restNames}"
              ><span aria-hidden="true">+${rest.length}</span
              ><span class="visually-hidden">${restNames}</span></span
            >`
          : ''}
      </span>
      <span class="chip neutral count" title="${allNames}"
        ><svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="${mdiTagOutline}" /></svg
        ><span aria-hidden="true">${tags.length}</span
        ><span class="visually-hidden">${allNames}</span></span
      >
    `
  }
}

window.customElements.define('grampsjs-tag-chips', GrampsjsTagChips)
