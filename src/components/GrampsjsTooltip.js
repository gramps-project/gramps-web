import tippy from 'tippy.js'

import {html, css, LitElement} from 'lit'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsTooltip extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      css`
        :host {
          display: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      for: {type: String},
      target: {type: Object, attribute: false},
      content: {type: String},
      theme: {type: String},
      _tippy: {type: Object},
    }
  }

  constructor() {
    super()
    this.for = ''
    this.target = {}
    this.content = ''
    this.theme = ''
    this._tippy = {}
  }

  _getTarget() {
    const {parentNode} = this
    // If the parentNode is a document fragment, then we need to use the host.
    const ownerRoot = this.getRootNode()
    let target
    if (this.for) {
      target = ownerRoot.querySelector(`#${this.for}`)
    } else {
      target =
        parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE
          ? ownerRoot.host
          : parentNode
    }
    return target
  }

  firstUpdated() {
    this.target = this._getTarget()
    this._initTippy()
  }

  updated(changedProperties) {
    if (changedProperties.has('content') && this.content) {
      this._tippy.setContent(this.content)
    }
    if (changedProperties.has('appState')) {
      this._tippy.setContent(this.content || this.innerHTML)
    }
  }

  _initTippy() {
    const options = {
      content: this.innerHTML,
      allowHTML: true,
      zIndex: 19999,
    }
    if (this.theme) {
      options.theme = this.theme
    }
    this._tippy = tippy(this.target, options)
  }

  render() {
    return html`<slot></slot>`
  }
}

window.customElements.define('grampsjs-tooltip', GrampsjsTooltip)
