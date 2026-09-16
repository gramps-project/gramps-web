import {html, css} from 'lit'

import '@material/web/menu/menu'
import '@material/web/menu/menu-item'

import {TreeChart} from '../charts/TreeChart.js'
import {
  layoutAncestors,
  layoutDescendants,
  layoutHourglass,
} from '../charts/layout/treeLayout.js'
import {GrampsjsChartBase} from './GrampsjsChartBase.js'
import {
  chartTransitionDuration,
  formatChartName,
  getImageUrl,
} from '../charts/util.js'
import {fireEvent, menuSelectionHandler} from '../util.js'
import {personListItemStyles} from '../SharedStyles.js'
import {renderPersonAvatar, renderPersonDates} from './personListUtils.js'

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
      personListItemStyles,
      css`
        #relatives-menu {
          min-width: 200px;
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
        @pedigree:show-children="${this._openMenu}"
        style="position:relative;"
      >
        <div id="container"></div>
        ${this.renderRelativesMenu()}
      </div>
    `
  }

  firstUpdated() {
    super.firstUpdated()
    this.renderRoot.getElementById('container').append(this._chart.node)
  }

  willUpdate(changed) {
    super.willUpdate(changed)
    if (!layoutProperties.some(name => changed.has(name))) {
      return
    }
    // A selected person who is not in the data yet is still being fetched, so
    // the current chart stays until new data arrives. If the new data does not
    // contain them either, the chart is cleared.
    const layout = this._computeLayout()
    if (layout || changed.has('data')) {
      this._layout = layout
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
    this._chart.update(this._layout, {
      childrenTriangle: this._relatives().length > 0,
      triangleLabel: this.descendants ? this._('Parents') : this._('Children'),
      getImageUrl: d => getImageUrl(d.person, 100),
      orientation: this.descendants ? 'RTL' : 'LTR',
      bboxWidth: this.containerWidth,
      bboxHeight: this.containerHeight,
      nameDisplayFormat: this.nameDisplayFormat,
      canEdit: this.canEdit,
      duration: chartTransitionDuration(),
    })
  }

  // Returns the relatives in the menu of the root person's triangle: the
  // parents in a descendant chart and the birth children in an ancestor
  // chart. Hourglass charts show both, so they have no menu. People who were
  // not fetched are left out.
  _relatives() {
    if (this.ancestors && this.descendants) {
      return []
    }
    const {handle} = this._graph.personByGrampsId(this.grampsId) ?? {}
    if (!handle) {
      return []
    }
    const handles = this.descendants
      ? Object.values(this._graph.parents(handle))
      : this._graph.children(handle, {birthOnly: true})
    return handles
      .map(relative => this._graph.person(relative))
      .filter(person => person?.gramps_id)
  }

  renderRelativesMenu() {
    const relatives = this._relatives()
    if (relatives.length === 0) {
      return ''
    }
    return html`
      <md-menu
        id="relatives-menu"
        positioning="fixed"
        @close-menu=${menuSelectionHandler(item =>
          this._selectPerson(item.dataset.grampsId)
        )}
      >
        ${relatives.map(
          person => html`
            <md-menu-item data-gramps-id="${person.gramps_id}">
              ${renderPersonAvatar(person, person.profile?.sex)}
              <div slot="headline">
                ${formatChartName(person.profile, this.nameDisplayFormat)}
              </div>
              ${renderPersonDates(person.profile)}
            </md-menu-item>
          `
        )}
      </md-menu>
    `
  }

  _selectPerson(grampsId) {
    fireEvent(this, 'pedigree:person-selected', {grampsId})
  }

  _openMenu() {
    const menu = this.renderRoot.getElementById('relatives-menu')
    if (menu) {
      this._updateMenuAnchor()
      menu.open = true
    }
  }

  _updateMenuAnchor() {
    const menu = this.renderRoot.getElementById('relatives-menu')
    const triangle = this.renderRoot.getElementById('triangle-children')
    if (menu && triangle) {
      menu.anchorElement = triangle
    }
  }
}

window.customElements.define('grampsjs-tree-chart', GrampsjsTreeChart)
