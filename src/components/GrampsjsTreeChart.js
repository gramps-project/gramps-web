import {html, css} from 'lit'

import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import {TreeChart} from '../charts/TreeChart.js'
import {GrampsjsChartBase} from './GrampsjsChartBase.js'
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
        getImageUrl: d => getImageUrl(d?.data?.person || {}, 200),
        orientation: this.descendants ? 'RTL' : 'LTR',
        gapX: this.gapX,
        bboxWidth: this.containerWidth,
        bboxHeight: this.containerHeight,
        nameDisplayFormat: this.nameDisplayFormat,
      })}
    `
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
                >${child.name_given || html`$hellip;`}</mwc-list-item
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

  update(changed) {
    super.update(changed)
    if (changed.has('data')) {
      this._updateMenuAnchor()
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
