import {html, css, LitElement} from 'lit-element'

import {sharedStyles} from '../SharedStyles.js'


class GrampsjsRectContainer extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
      #rect-container {
        display: inline-block;
        position: relative;
      }
      `
    ]
  }

  render() {
    return html`
    <div id="rect-container">
    <slot></slot>
    </div>
    `
  }


}

window.customElements.define('grampsjs-rect-container', GrampsjsRectContainer)
