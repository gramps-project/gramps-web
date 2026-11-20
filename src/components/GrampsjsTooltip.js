import tippy from 'tippy.js'

import {html, css, LitElement} from 'lit'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

// Whether `node` is shown inside an open modal dialog, following slots and
// shadow roots up the rendered tree
export function isInModalDialog(node) {
  let current = node
  while (current) {
    if (current.localName === 'dialog' && current.matches(':modal')) {
      return true
    }
    current = current.assignedSlot ?? current.parentNode ?? current.host
  }
  return false
}

// A modal dialog is in the top layer, above the tooltip in the page's body.
// Inside one, the tooltip opens as a popover, which enters the top layer
// above the dialog. Top layer elements are positioned in the viewport, and
// the popover's own styles apply only once it is open, so the tooltip is
// positioned again after opening.
export function showAboveModalDialog(instance) {
  const {popper, reference, popperInstance} = instance
  if (typeof popper.showPopover !== 'function' || !isInModalDialog(reference)) {
    return
  }
  popperInstance?.setOptions(options => ({...options, strategy: 'fixed'}))
  popper.setAttribute('popover', 'manual')
  popper.showPopover()
  popperInstance?.forceUpdate()
}

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
      placement: {type: String},
      _tippy: {type: Object},
    }
  }

  constructor() {
    super()
    this.for = ''
    this.target = {}
    this.content = ''
    this.theme = ''
    this.placement = ''
    this._tippy = {}
  }

  connectedCallback() {
    super.connectedCallback()
    // reattached after a disconnect, which destroyed the tooltip
    if (this.hasUpdated && !this._tippy.setContent) {
      this.target = this._getTarget()
      this._initTippy()
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._tippy.destroy?.()
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
      onMount: showAboveModalDialog,
      // tippy reuses the element; a closed popover is hidden and could not
      // be measured when the tooltip is shown next
      onHidden: instance => instance.popper.removeAttribute('popover'),
    }
    if (this.theme) {
      options.theme = this.theme
    }
    if (this.placement) {
      options.placement = this.placement
    }
    this._tippy = tippy(this.target, options)
  }

  render() {
    return html`<slot></slot>`
  }
}

window.customElements.define('grampsjs-tooltip', GrampsjsTooltip)
