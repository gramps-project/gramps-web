import {html, css} from 'lit'
import {zoomIdentity, zoomTransform} from 'd3-zoom'

import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import {TreeChart} from '../charts/TreeChart.js'
import {
  layoutAncestors,
  layoutDescendants,
  layoutHourglass,
} from '../charts/layout/treeLayout.js'
import {GrampsjsChartBase} from './GrampsjsChartBase.js'
import {getDescendantTree, getTree, getImageUrl} from '../charts/util.js'
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
    this._savedZoom = null
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

  willUpdate(changed) {
    super.willUpdate(changed)
    // Save zoom transform before Lit replaces the SVG node. A new root person
    // keeps only the zoom level, so they start at the default position.
    const svg = this.renderRoot
      ?.getElementById('container')
      ?.querySelector('svg')
    if (!svg) {
      this._savedZoom = null
      return
    }
    const transform = zoomTransform(svg)
    this._savedZoom = changed.has('grampsId')
      ? zoomIdentity.scale(transform.k)
      : transform
  }

  updated() {
    this._updateMenuAnchor()
  }

  renderChart() {
    if (this.data.length === 0 || !this.grampsId) {
      return ''
    }
    const {handle} = this._graph.personByGrampsId(this.grampsId) ?? {}
    if (!handle) {
      return ''
    }
    let childrenTriangle = false
    if (this.descendants && this.ancestors) {
      childrenTriangle = false
    } else if (this.descendants) {
      childrenTriangle = this._hasParents()
    } else {
      childrenTriangle = this._hasChildren()
    }
    return html`
      ${TreeChart(this._layout(handle), {
        childrenTriangle,
        getImageUrl: d => getImageUrl(d.person, 100),
        orientation: this.descendants ? 'RTL' : 'LTR',
        bboxWidth: this.containerWidth,
        bboxHeight: this.containerHeight,
        nameDisplayFormat: this.nameDisplayFormat,
        canEdit: this.canEdit,
        initialZoom: this._savedZoom,
      })}
    `
  }

  _layout(handle) {
    if (this.ancestors && this.descendants) {
      return layoutHourglass(this._graph, handle, {
        ancestorDepth: this.nAnc,
        descendantDepth: this.nDesc,
        gapX: this.gapX,
      })
    }
    if (this.descendants) {
      return layoutDescendants(this._graph, handle, {
        depth: this.nDesc,
        gapX: this.gapX,
      })
    }
    return layoutAncestors(this._graph, handle, {
      depth: this.nAnc,
      gapX: this.gapX,
    })
  }

  _hasChildren() {
    const {handle} = this._graph.personByGrampsId(this.grampsId) ?? {}
    return this._graph.children(handle, {birthOnly: true}).length > 0
  }

  _hasParents() {
    const {handle} = this._graph.personByGrampsId(this.grampsId) ?? {}
    const {father, mother} = this._graph.parents(handle)
    return Boolean(father || mother)
  }

  renderChildrenMenu() {
    const {handle} = this._graph.personByGrampsId(this.grampsId) ?? {}
    const data = this.descendants
      ? getTree(this._graph, handle, 2, false)
      : getDescendantTree(this._graph, handle, 2)
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
