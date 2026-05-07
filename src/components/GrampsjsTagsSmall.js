import {LitElement, css, html} from 'lit'

import {hex6ToCss, hex12ToCss} from '../color.js'
import {sharedStyles} from '../SharedStyles.js'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsTagsSmall extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .chip {
          font-size: 11px;
          font-weight: 500;
          font-family: var(--grampsjs-body-font-family);
          padding: 0px 12px;
          border-radius: 6px;
          margin: 0 3px;
          height: 24px;
          display: inline-block;
          line-height: 24px;
          vertical-align: middle;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
    }
  }

  constructor() {
    super()
    this.data = []
  }

  render() {
    if (Object.keys(this.data).length === 0) {
      return html``
    }
    return html`
      ${this.data.map(obj => {
        const color =
          (obj.color?.length > 7
            ? hex12ToCss(obj.color, 0.8)
            : hex6ToCss(obj.color, 0.8)) || 'var(--grampsjs-body-font-color-60)'
        return html`<span
          class="chip"
          style="background-color:${color};color:white;"
          >${obj.name}</span
        >`
      })}
    `
  }

  _handleList() {
    return this.data.map(_obj => _obj.handle)
  }
}

window.customElements.define('grampsjs-tags-small', GrampsjsTagsSmall)
