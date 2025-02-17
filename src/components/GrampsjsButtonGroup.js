import {LitElement, html, css} from 'lit'

import '@material/mwc-icon-button'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsTooltip.js'

export class GrampsjsButtonGroup extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #button-container {
          --mdc-typography-button-font-size: 12px;
          margin: 12px 0;
        }

        #button-container div {
          border: 1px solid var(--mdc-theme-primary);
          opacity: 0.9;
          border-radius: 8px;
          display: inline-block;
          padding: 4px;
        }
      `,
    ]
  }

  render() {
    return html`
      <div id="button-container">
        <div>
          <slot></slot>
        </div>
      </div>
    `
  }
}

window.customElements.define('grampsjs-button-group', GrampsjsButtonGroup)
