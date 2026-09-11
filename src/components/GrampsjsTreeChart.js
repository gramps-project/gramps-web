import {html, css} from 'lit'

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

// Properties that change the layout of the chart
const layoutProperties = [
  'data',
  'grampsId',
  'ancestors',
  'descendants',
  'nAnc',
  'nDesc',
  'gapX',
]

class GrampsjsTreeChart extends GrampsjsChartBase {
  static get styles() {
    return [
      super.styles,
      css`
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
    this._chart = new TreeChart()
    this._layout = null
  }

  render() {
    return html`
      <div
        @pedigree:show-children="${this._handleShowChildren}"
        style="position:relative;"
      >
        <div id="container"></div>
        ${this.renderChildrenMenu()}
      </div>
    `
  }

  firstUpdated() {
    super.firstUpdated()
    this.renderRoot.getElementById('container').append(this._chart.node)
  }

  willUpdate(changed) {
    super.willUpdate(changed)
    if (layoutProperties.some(name => changed.has(name))) {
      this._layout = this._computeLayout()
    }
  }

  updated() {
    this._drawChart()
    this._updateMenuAnchor()
  }

  _computeLayout() {
    const {handle} = this._graph.personByGrampsId(this.grampsId) ?? {}
    if (!handle) {
      return null
    }
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

  _drawChart() {
    if (!this._layout) {
      this._chart.clear()
      return
    }
    let childrenTriangle = false
    if (this.descendants && this.ancestors) {
      childrenTriangle = false
    } else if (this.descendants) {
      childrenTriangle = this._hasParents()
    } else {
      childrenTriangle = this._hasChildren()
    }
    this._chart.update(this._layout, {
      childrenTriangle,
      getImageUrl: d => getImageUrl(d.person, 100),
      orientation: this.descendants ? 'RTL' : 'LTR',
      bboxWidth: this.containerWidth,
      bboxHeight: this.containerHeight,
      nameDisplayFormat: this.nameDisplayFormat,
      canEdit: this.canEdit,
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
