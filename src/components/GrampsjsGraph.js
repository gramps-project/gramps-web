import {html, css, LitElement} from 'lit'

import * as hpccWasm from '@hpcc-js/wasm'

import '@material/mwc-icon'
import '@material/mwc-icon-button'
import '@material/mwc-list/mwc-list-item'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'

// transform 2D coordinates (x, y) to SVG coordinates.
// element can be the SVG itself or an element within it
// (possibly transformed)
function transformSvgCoords (svg, element, x, y) {
  const point = svg.createSVGPoint()
  point.x = x
  point.y = y
  const invertedSVGMatrix = element.getScreenCTM().inverse()
  return point.matrixTransform(invertedSVGMatrix)
}

// get a point in SVG coordinates from an event
function getPointFromEvent (svg, event) {
  return transformSvgCoords(svg, svg, event.clientX, event.clientY)
}

const _zoomDefault = 0.7

class GrampsjsGraph extends LitElement {
  static get styles () {
    return [
      sharedStyles,
      css`
      :host {
        width: 100%;
        height: 100%;
      }

      #controls {
        z-index: 1;
        position: absolute;
        top: 85px;
        left: 15px;
        border-radius: 5px;
        background-color: rgba(255, 255, 255, 0.9);
      }

      #controls mwc-icon-button {
        color: rgba(0, 0, 0, 0.3);
        --mdc-icon-size: 26px;
        --mdc-theme-text-disabled-on-light: rgba(0, 0, 0, 0.1);
      }

      #graph {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      #graph svg text {
        font-family: Roboto;
      }

      #graph svg {
        height: 100%;
        width: 100%;
        position: relative;
        left: 0;
        top: 0;
        touch-action: none;
      }

      #graph svg .edge path {
        stroke-width: 1px;
        stroke: #ccc;
      }

      #graph svg .edge polygon {
        fill: #ccc;
        stroke: #ccc;
        stroke-width: 0;
      }

      g.node polygon, g.node path {
        fill: #ffffff;
      }

      g#node1 polygon {
        fill: #64B5F6;
      }

      g#node1 path {
        fill: #EF9A9A;
      }

      svg ellipse {
        stroke: #999;
      }

      g.node text {
        font-weight: 400;
        font-size: 13px;
      }

      g.node text:last-of-type {
        font-weight: 300;
        font-size: 12px;
      }

      g.node polygon, g.node path, g.node text {
        cursor: pointer;
      }

      svg {
        cursor: grab;
      }
      `
    ]
  }

  static get properties () {
    return {
      src: {type: String},
      scale: {type: Number},
      disableBack: {type: Boolean},
      _svg: {type: Object},
      _svgPointerDown: {type: Boolean},
      _zoomInPointerDown: {type: Boolean},
      _zoomOutPointerDown: {type: Boolean},
      _pointerOrigin: {type: Object},
      _interval: {type: Object}
    }
  }

  constructor () {
    super()
    this.src = ''
    this.scale = _zoomDefault
    this.disableBack = true
    this._svgPointerDown = false
    this._zoomInPointerDown = false
    this._zoomOutPointerDown = false
  }

  render () {
    return html`
    <div id="graph" @click=${this._handleClick}>
    </div>
    <div id="controls">
      ${this._renderControls()}
    </div>
  `
  }

  _renderControls () {
    return html`
      <div>
        <mwc-icon-button
          icon="zoom_in"
          style="margin-bottom:-10px;"
          @pointerdown=${this._zoomInDown}
          @pointerup=${this._zoomInUp}
          @pointerleave=${this._zoomInUp}
        ></mwc-icon-button>
      </div>
      <div>
      <mwc-icon-button
      icon="zoom_out"
      style="margin-bottom:-10px;"
      @pointerdown=${this._zoomOutDown}
      @pointerup=${this._zoomOutUp}
      @pointerleave=${this._zoomOutUp}
    ></mwc-icon-button>
      </div>
      <div>
        <mwc-icon-button icon="crop_free" @click=${this._resetZoom} style="margin-bottom:-10px;"></mwc-icon-button>
      </div>
      <div>
        <mwc-icon-button icon="home" @click=${this._backToHomePerson} style="margin-bottom:-10px;"></mwc-icon-button>
      </div>
      <div>
        <mwc-icon-button
          icon="arrow_back"
          @click=${this._handleBack}
          ?disabled=${this.disableBack}
          style="margin-bottom:-10px;"
        ></mwc-icon-button>
      </div>
      <div>
        <mwc-icon-button icon="person" @click=${this._goToPerson}></mwc-icon-button>
      </div>
      `
    // <div>
    //   <mwc-icon-button icon="settings" id="btn-controls" @click=${this._openMenuControls}></mwc-icon-button>
    //   <mwc-menu
    //     id="menu-controls"
    //     corner="TOP_LEFT"
    //     menuCorner="START" x="0" y="0"
    //     defaultFocus="NONE"
    //     >
    //     <mwc-list-item graphic="icon">
    //       <mwc-icon slot="graphic">check</mwc-icon>
    //     </mwc-list-item>
    //     <mwc-list-item>Item 1</mwc-list-item>
    //     <mwc-list-item>Item 2</mwc-list-item>
    //     <mwc-list-item>Item 3</mwc-list-item>
    //   </mwc-menu>
    // </div>
  }

  _backToHomePerson () {
    fireEvent(this, 'graph:home')
  }

  _goToPerson () {
    fireEvent(this, 'graph:person')
  }

  _handleBack () {
    fireEvent(this, 'graph:back')
  }

  _zoomIn (f) {
    this.scale = this.scale * f
  }

  // zoom in when mouse clicked/touch starts
  _zoomInDown () {
    this._zoomIn(1.1)
    this._zoomInPointerDown = true
    setTimeout(() => {
      if (this._zoomInPointerDown) {
        this._interval = setInterval(() => {
          if (this._zoomInPointerDown) {
            this._zoomIn(1.04)
          }
        },
        20)
      }
    }, 700)
  }

  // stop zooming in
  _zoomInUp () {
    this._zoomInPointerDown = false
    clearInterval(this._interval)
  }

  _zoomOut (f) {
    this.scale = this.scale / f
  }

  // zoom out when mouse clicked/touch starts
  _zoomOutDown () {
    this._zoomOut(1.1)
    this._zoomOutPointerDown = true
    setTimeout(() => {
      if (this._zoomOutPointerDown) {
        this._interval = setInterval(() => {
          if (this._zoomOutPointerDown) {
            this._zoomOut(1.04)
          }
        },
        20)
      }
    }, 700)
  }

  // stop zooming out
  _zoomOutUp () {
    this._zoomOutPointerDown = false
    clearInterval(this._interval)
  }

  _resetZoom () {
    this.scaleSvg(_zoomDefault)
    this.centerSvg()
    this.scale = _zoomDefault
  }

  // click: find out if it is a person node: has title and no ellipse
  _handleClick (event) {
    const g = event.target.closest('g')
    if (g !== null) {
      const title = g.querySelector('title')
      if (title.innerHTML && g.querySelector('ellipse') === null) {
        // set new person gramps ID
        return this._personSelected(title.innerHTML)
      }
    }
    return null
  }

  update (changed) {
    super.update(changed)
    if (changed.has('src')) {
      this._renderGraph()
    }
  }

  updated (changed) {
    if (changed.has('scale')) {
      if (this._svg !== undefined) {
        this.scaleSvg(this.scale)
      }
    }
  }

  _renderGraph () {
    hpccWasm.graphvizSync().then(graphviz => {
      const div = this.shadowRoot.getElementById('graph')
      if (div === null) {
        return
      }
      div.innerHTML = graphviz.layout(this.src, 'svg', 'dot')
      this._svg = this.shadowRoot.querySelector('svg')
      if (this._svg === null) {
        return
      }
      // use arrow functions to bind correct 'this'
      this._svg.addEventListener('pointerup', (e) => this._pUp(e))
      this._svg.addEventListener('pointerleave', (e) => this._pUp(e))
      this._svg.addEventListener('pointerdown', (e) => this._pDown(e))
      this._svg.addEventListener('pointermove', (e) => this._pMove(e))
      this.scaleSvg(this.scale)
      this.centerSvg()
    })
  }

  // start panning
  _pDown (event) {
    if (this._svg === undefined) {
      return
    }
    this._svgPointerDown = true
    this._pointerOrigin = getPointFromEvent(this._svg, event)
    this._svg.style.cursor = 'grabbing'
  }

  // pan
  _pMove (event) {
    if (!this._svgPointerDown) {
      return
    }
    event.preventDefault()
    const pointerPosition = getPointFromEvent(this._svg, event)
    const viewBox = this._svg.viewBox.baseVal
    viewBox.x -= (pointerPosition.x - this._pointerOrigin.x)
    viewBox.y -= (pointerPosition.y - this._pointerOrigin.y)
  }

  // stop panning
  _pUp (event) {
    this._svgPointerDown = false
    this._svg.style.cursor = 'grab'
  }

  scaleSvg (s) {
    const viewBox = this._svg.viewBox.baseVal
    const container = this.shadowRoot.querySelector('#graph')
    const bb = container.getBoundingClientRect()
    const pt = 4 / 3
    const wOld = viewBox.width
    const hOld = viewBox.height
    viewBox.width = bb.width / pt / s
    viewBox.height = bb.height / pt / s
    // shift to scale around viewBox center
    viewBox.x += (wOld - viewBox.width) / 2
    viewBox.y += (hOld - viewBox.height) / 2
  }

  centerSvg () {
    const bbox = this._svg.getBBox()
    const viewBox = this._svg.viewBox.baseVal
    viewBox.x = (bbox.x + bbox.width / 2) - viewBox.width / 2
    viewBox.y = (bbox.y + bbox.height / 2) - viewBox.height / 2
  }

  // center the element given by selector in the center of the parent
  // container
  centerSvgOn (selectorString) {
    const el = this.shadowRoot.querySelector(selectorString)
    const cont = this.shadowRoot.querySelector('#graph')
    if (el === null) {
      return
    }
    const bbTarget = el.getBoundingClientRect()
    const bbCont = cont.getBoundingClientRect()
    const xCenterPxOld = bbTarget.left + bbTarget.width / 2
    const yCenterPxOld = bbTarget.bottom + bbTarget.height / 2
    const pointOld = transformSvgCoords(this._svg, this._svg, xCenterPxOld, yCenterPxOld)
    const xCenterPxNew = bbCont.left + bbCont.width / 2
    const yCenterPxNew = bbCont.top + bbCont.height / 2
    const pointNew = transformSvgCoords(this._svg, this._svg, xCenterPxNew, yCenterPxNew)
    const dx = pointNew.x - pointOld.x
    const dy = pointNew.y - pointOld.y
    const viewBox = this._svg.viewBox.baseVal
    viewBox.x += -dx
    viewBox.y += -dy
  }

  _openMenuControls () {
    const menu = this.shadowRoot.getElementById('menu-controls')
    menu.open = true
  }

  // firstUpdated () {
  //   const btn = this.shadowRoot.getElementById('btn-controls')
  //   const menu = this.shadowRoot.getElementById('menu-controls')
  //   menu.anchor = btn
  // }

  _handleResize () {
    this.scaleSvg(this.scale)
  }

  connectedCallback () {
    super.connectedCallback()
    window.addEventListener('resize', () => this._handleResize())
  }

  disconnectedCallback () {
    window.removeEventListener('resize', () => this._handleResize())
    super.disconnectedCallback()
  }

  _personSelected (grampsId) {
    this.dispatchEvent(new CustomEvent('pedigree:person-selected', {bubbles: true, composed: true, detail: {grampsId}}))
  }
}

window.customElements.define('grampsjs-graph', GrampsjsGraph)
