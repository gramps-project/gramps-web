import {html, css, LitElement} from 'lit'

import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {TreeChart} from '../charts/TreeChart.js'
import {
  getDescendantTree,
  getPersonByGrampsId,
  getTree,
  getImageUrl,
} from '../charts/util.js'
import {fireEvent, clickKeyHandler} from '../util.js'

class GrampsjsTreeChart extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        svg a {
          text-decoration: none !important;
        }

        div#container {
          display: flex;
          justify-content: center;
          align-items: center;
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
      depth: {type: Number},
      data: {type: Array},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.depth = 5
    this.data = []
  }

  render() {
    if (this.data.length === 0 || !this.grampsId) {
      return ''
    }
    return html`
      <div
        @pedigree:show-children="${this._handleShowChildren}"
        style="position:relative;"
      >
        ${this.renderChart()} ${this.renderChildrenMenu()}
      </div>
    `
  }

  renderChart() {
    const {handle} = getPersonByGrampsId(this.data, this.grampsId)
    if (!handle) {
      return ''
    }
    const data = getTree(this.data, handle, this.depth, false)
    return html`
      <div id="container">
        ${TreeChart(data, {
          depth: this.depth,
          childrenTriangle: this._hasChildren(),
          getImageUrl: d => getImageUrl(d?.data?.person || {}, 200),
        })}
      </div>
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

  renderChildrenMenu() {
    const {handle} = getPersonByGrampsId(this.data, this.grampsId)
    const data = getDescendantTree(this.data, handle, 2)
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
