import {html, css} from 'lit'
import {select} from 'd3-selection'

import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import {TreeChart} from '../charts/TreeChart.js'
import {GrampsjsChartBase} from './GrampsjsChartBase.js'
import {appendAddPersonButton} from '../charts/addPersonButton.js'
import {
  getDescendantTree,
  getPersonByGrampsId,
  getTree,
  getImageUrl,
} from '../charts/util.js'
import {fireEvent, clickKeyHandler} from '../util.js'

class GrampsjsTreeChart extends GrampsjsChartBase {
  static get styles() {
    return [
      super.styles,
      css`
        svg a {
          text-decoration: none !important;
        }

        mwc-menu {
          --mdc-typography-subtitle1-font-size: 13px;
          --mdc-menu-item-height: 36px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      nAnc: {type: Number},
      nDesc: {type: Number},
      ancestors: {type: Boolean},
      descendants: {type: Boolean},
      gapX: {type: Number},
      nameDisplayFormat: {type: String},
      canEdit: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.nAnc = 5
    this.nDesc = 5
    this.gapX = 30
  }

  render() {
    return html`
      <div
        @pedigree:show-children="${this._handleShowChildren}"
        style="position:relative;"
      >
        <div id="container">${this.renderChart()}</div>
        ${this.renderChildrenMenu()}
      </div>
    `
  }

  shouldUpdate(changedProps) {
    // canEdit-only change: update buttons without re-rendering (preserves zoom)
    if (changedProps.size === 1 && changedProps.has('canEdit')) {
      this._updateAddPersonButtons()
      return false
    }
    return super.shouldUpdate(changedProps)
  }

  updated() {
    this._updateAddPersonButtons()
    this._updateMenuAnchor()
  }

  renderChart() {
    if (this.data.length === 0 || !this.grampsId) {
      return ''
    }
    const {handle} = getPersonByGrampsId(this.data, this.grampsId)
    if (!handle) {
      return ''
    }
    const dataDescendants = this.descendants
      ? getDescendantTree(this.data, handle, this.nDesc)
      : false
    const dataAncestors = this.ancestors
      ? getTree(this.data, handle, this.nAnc, false)
      : false
    let childrenTriangle = false
    if (this.descendants && this.ancestors) {
      childrenTriangle = false
    } else if (this.descendants) {
      childrenTriangle = this._hasParents()
    } else {
      childrenTriangle = this._hasChildren()
    }
    return html`
      ${TreeChart(dataDescendants, dataAncestors, {
        nAnc: this.nAnc,
        nDesc: this.nDesc,
        childrenTriangle,
        getImageUrl: d => getImageUrl(d?.data?.person || {}, 100),
        orientation: this.descendants ? 'RTL' : 'LTR',
        gapX: this.gapX,
        bboxWidth: this.containerWidth,
        bboxHeight: this.containerHeight,
        nameDisplayFormat: this.nameDisplayFormat,
        canEdit: false,
      })}
    `
  }

  _updateAddPersonButtons() {
    const container = this.renderRoot.getElementById('container')
    if (!container) {
      return
    }
    const svg = container.querySelector('svg')
    if (!svg) {
      return
    }
    const svgSel = select(svg)
    svgSel.selectAll('g.add-person-btn').remove()
    if (this.canEdit) {
      const boxWidth = 190
      const boxHeight = 90
      const personNodes = svgSel
        .select('#chart-content')
        .selectAll('a')
        .filter(d => d?.data?.person)
      appendAddPersonButton(
        personNodes,
        boxWidth / 2 - 14,
        -boxHeight / 2 + 14,
        d => d.data.person?.handle
      )
    }
  }

  _hasChildren() {
    const {handle} = getPersonByGrampsId(this.data, this.grampsId)
    const data = getDescendantTree(this.data, handle, 2)
    if (data.children && data.children.length) {
      return true
    }
    return false
  }

  _hasParents() {
    const {handle} = getPersonByGrampsId(this.data, this.grampsId)
    const data = getTree(this.data, handle, 2, false)
    if (data.children && data.children.length) {
      return true
    }
    return false
  }

  renderChildrenMenu() {
    const {handle} = getPersonByGrampsId(this.data, this.grampsId)
    const data = this.descendants
      ? getTree(this.data, handle, 2, false)
      : getDescendantTree(this.data, handle, 2)
    const {children} = data
    if (!children || !children.length) {
      return ''
    }
    return html`
      <mwc-menu fixed corner="BOTTOM_LEFT" menuCorner="START">
        ${children.map(
          child =>
            html`
              <mwc-list-item
                @click=${() => this._handleChild(child.person.gramps_id)}
                @keydown=${clickKeyHandler}
                >${child.name_given || html`&hellip;`}</mwc-list-item
              >
            `
        )}
      </mwc-menu>
    `
  }

  _handleChild(grampsId) {
    fireEvent(this, 'pedigree:person-selected', {grampsId})
    this._closeMenu()
  }

  _handleShowChildren() {
    const triangle = this.renderRoot.querySelector('#triangle-children')
    if (triangle !== null) {
      this._openMenu()
    }
  }

  _openMenu() {
    const menu = this.renderRoot.querySelector('mwc-menu')
    if (menu !== null) {
      menu.open = true
    }
  }

  _closeMenu() {
    const menu = this.renderRoot.querySelector('mwc-menu')
    if (menu !== null) {
      menu.open = false
    }
  }

  _updateMenuAnchor() {
    const menu = this.renderRoot.querySelector('mwc-menu')
    const triangle = this.renderRoot.querySelector('#triangle-children')
    if (menu !== null && triangle !== null) {
      menu.anchor = triangle
    }
  }
}

window.customElements.define('grampsjs-tree-chart', GrampsjsTreeChart)
