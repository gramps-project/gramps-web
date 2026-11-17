import {delegate} from 'tippy.js'

import {html, css, render, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {select} from 'd3-selection'
import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsChipChoice.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {
  ChromosomeBrowser,
  chromosomeBrowserSvgDocument,
  matchColor,
  matchStroke,
  chromosomeKey,
} from '../charts/ChromosomeBrowser.js'
import {clickKeyHandler, fireEvent, personDisplayName} from '../util.js'

// The names of the person profiles, skipping profiles without a name
function profileNames(profiles) {
  return (profiles ?? [])
    .map(profile =>
      [profile.name_given, profile.name_surname].filter(Boolean).join(' ')
    )
    .filter(Boolean)
}

// The lowest distance of the matches at `members`, Infinity if none has one
function closestDistance(data, members) {
  return Math.min(...members.map(i => data[i].distance ?? Infinity))
}

// Groups the matches in `data` for the colours and the legend. With `by` set
// to 'ancestor', matches sharing the same set of most recent common ancestors
// form one group, ordered closest first, with the matches without any last;
// otherwise each match is a group of its own. Returns the `groups`, each with
// its `key` ('' for no common ancestors) and the match indices in `members`,
// and in `groupOf` the group index of each match.
export function matchGroups(data, by) {
  if (by !== 'ancestor') {
    return {
      groups: data.map((match, i) => ({key: match.handle, members: [i]})),
      groupOf: data.map((match, i) => i),
    }
  }
  const members = new Map()
  data.forEach((match, i) => {
    const key = [...new Set(match.ancestor_handles ?? [])].sort().join(' ')
    members.set(key, [...(members.get(key) ?? []), i])
  })
  const groups = [...members]
    .map(([key, indices]) => ({
      key,
      members: indices,
      distance: closestDistance(data, indices),
    }))
    .sort((a, b) => {
      if ((a.key === '') !== (b.key === '')) {
        return a.key === '' ? 1 : -1
      }
      if (a.distance === b.distance) {
        return 0
      }
      return a.distance < b.distance ? -1 : 1
    })
    .map(({key, members: indices}) => ({key, members: indices}))
  const groupOf = []
  groups.forEach((group, index) => {
    group.members.forEach(i => {
      groupOf[i] = index
    })
  })
  return {groups, groupOf}
}

export class GrampsjsChromosomeBrowser extends GrampsjsAppStateMixin(
  LitElement
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        svg a {
          text-decoration: none !important;
        }

        :host {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          column-gap: 20px;
        }

        div#container {
          flex: 1 1 400px;
          min-width: 0;
          max-width: 800px;
          margin-bottom: 20px;
        }

        div#legend {
          flex: 0 1 auto;
          padding: 0;
          font-size: 15px;
          font-weight: var(--grampsjs-font-weight-body);
        }

        #legend grampsjs-chip-choice {
          display: block;
          margin-bottom: 12px;
        }

        /* The rows' padding holds the hover background; the negative margin
           aligns their dots with the chips above */
        #legend ul {
          list-style-type: none;
          padding: 0;
          margin: 0 -4px;
        }

        #legend ul li {
          padding: 4px;
          margin: 0;
          cursor: pointer;
        }

        /* Matches without segments on the chart */
        #legend ul li.empty {
          opacity: 0.5;
        }

        #legend ul li.muted {
          opacity: 0.3;
        }

        #legend ul li.hovered {
          border-radius: 4px;
          background-color: var(--grampsjs-color-shade-230);
        }

        span.total {
          margin-left: 6px;
          color: var(--grampsjs-text-secondary-color);
        }

        div.members {
          margin-left: 19px;
          color: var(--grampsjs-text-secondary-color);
        }

        rect.segment {
          cursor: pointer;
          transition: opacity 0.15s;
        }

        rect.segment.dimmed {
          opacity: 0.15;
        }

        span.dot {
          display: inline-block;
          width: 11px;
          height: 11px;
          box-sizing: border-box;
          border: 1px solid;
          border-radius: 3px;
          margin-right: 8px;
        }

        @keyframes pulse {
          0% {
            opacity: 0.1;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.1;
          }
        }

        div.loading svg {
          animation: pulse 1.5s linear infinite;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      width: {type: Number},
      selected: {type: Number},
      person: {type: Object},
      loading: {type: Boolean},
      labelBy: {type: String},
      _hovered: {state: true},
    }
  }

  constructor() {
    super()
    this.data = []
    this.width = 600
    this.selected = -1
    this.person = {}
    this.loading = false
    this.labelBy = 'match'
    this._hovered = -1
    this._grouping = {groups: [], groupOf: []}
    this._chart = null
    this._tippy = null
    this._resizeObserver = null
    this._handleChartMouseOver = this._handleChartMouseOver.bind(this)
    this._handleChartMouseOut = this._handleChartMouseOut.bind(this)
    this._handleChartClick = this._handleChartClick.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    if (this.hasUpdated) {
      this._setUpContainer()
    }
  }

  disconnectedCallback() {
    this._tearDownContainer()
    super.disconnectedCallback()
  }

  willUpdate(changed) {
    if (changed.has('data') || changed.has('labelBy')) {
      this.selected = -1
      this._hovered = -1
      this._grouping = matchGroups(this.data, this.labelBy)
    }
    const rebuild =
      changed.has('data') ||
      changed.has('labelBy') ||
      changed.has('selected') ||
      changed.has('width') ||
      this._chart === null
    if (rebuild) {
      this._chart = ChromosomeBrowser(this._chartData(), {width: this.width})
    }
    if (rebuild || changed.has('_hovered')) {
      select(this._chart)
        .selectAll('rect.segment')
        .classed('dimmed', d => this._hovered > -1 && d.group !== this._hovered)
    }
  }

  render() {
    return html`
      <div id="container" class="${classMap({loading: this.loading})}">
        ${this._chart}
      </div>
      <div id="legend">
        <grampsjs-chip-choice
          .options="${[
            {value: 'match', label: this._('Matches')},
            {value: 'ancestor', label: this._('Common ancestors')},
          ]}"
          .selected="${this.labelBy}"
          @chip-choice:change="${this._handleLabelBy}"
        ></grampsjs-chip-choice>
        ${this.renderLegend()}
      </div>
    `
  }

  _handleLabelBy(e) {
    this.labelBy = e.detail.value
  }

  // The matches with their colour group, without the segments of matches
  // outside the selected group
  _chartData() {
    const {groupOf} = this._grouping
    return this.data.map((obj, index) =>
      this.selected < 0 || groupOf[index] === this.selected
        ? {...obj, group: groupOf[index]}
        : {segments: [], handle: obj.handle, group: groupOf[index]}
    )
  }

  // Whether any match of the group has a segment on the chart
  _hasSegments(group) {
    return group.members.some(i =>
      (this.data[i].segments ?? []).some(
        seg => chromosomeKey(seg.chromosome) !== null
      )
    )
  }

  // The legend label of a group: the match, or its common ancestors
  _groupLabel(group) {
    if (this.labelBy !== 'ancestor') {
      return this._getNameFromHandle(this.data[group.members[0]].handle)
    }
    if (group.key === '') {
      return this._('Unknown')
    }
    const profiles = this.data[group.members[0]].ancestor_profiles ?? []
    const names = profileNames(profiles)
    return (names.length ? names : profiles.map(p => p.gramps_id)).join(', ')
  }

  // The muted text of a group in the legend: the total cM of a match, or the
  // matches sharing the common ancestors
  _groupDetail(group) {
    if (this.labelBy !== 'ancestor') {
      return this._totalCm(this.data[group.members[0]])
    }
    return group.members
      .map(i => this._getNameFromHandle(this.data[i].handle))
      .join(', ')
  }

  _getNameFromHandle(handle) {
    const people = this.person?.extended?.people || []
    const person = people.find(p => p.handle === handle)
    return person ? personDisplayName(person) : ''
  }

  _numberFormat(options = {}) {
    return new Intl.NumberFormat(
      (this.appState?.i18n?.lang || 'en').replace('_', '-'),
      options
    )
  }

  // The bound datum of the segment rect under a pointer event, if any.
  static _segmentDatum(event) {
    const rect = event.target.closest?.('rect.segment')
    return rect ? select(rect).datum() : null
  }

  _handleChartMouseOver(event) {
    const seg = GrampsjsChromosomeBrowser._segmentDatum(event)
    if (seg) {
      this._hovered = seg.group
    }
  }

  _handleChartMouseOut(event) {
    if (GrampsjsChromosomeBrowser._segmentDatum(event)) {
      this._hovered = -1
    }
  }

  _handleChartClick(event) {
    const seg = GrampsjsChromosomeBrowser._segmentDatum(event)
    const people = this.person?.extended?.people || []
    const matchId = people.find(p => p.handle === seg?.handle)?.gramps_id
    if (matchId && this.person?.gramps_id) {
      fireEvent(this, 'nav', {
        path: `dna-matches/${this.person.gramps_id}/${matchId}`,
      })
    }
  }

  _totalCm(match) {
    const total = (match.segments ?? []).reduce(
      (sum, seg) => sum + (seg.cM || 0),
      0
    )
    return `${this._numberFormat({maximumFractionDigits: 1}).format(total)} cM`
  }

  // The chart as shown, with only the selected match if there is one, as a
  // standalone SVG document
  svgDocument() {
    const legend = this._grouping.groups
      .map((group, index) => ({
        index,
        label: this._groupLabel(group),
        detail: this._groupDetail(group),
      }))
      .filter(({index}) => this.selected < 0 || index === this.selected)
    return chromosomeBrowserSvgDocument(this._chartData(), legend)
  }

  renderLegend() {
    return html`<ul role="group">
      ${this._grouping.groups.map(
        (group, i) => html`
          <li
            @click="${e => this._handleLegendClick(e, i)}"
            @keydown="${clickKeyHandler}"
            @mouseenter="${() => {
              this._hovered = i
            }}"
            @mouseleave="${() => {
              this._hovered = -1
            }}"
            @focus="${() => {
              this._hovered = i
            }}"
            @blur="${() => {
              this._hovered = -1
            }}"
            class="${classMap({
              muted: this.selected > -1 && this.selected !== i,
              hovered: this._hovered === i,
              empty: !this._hasSegments(group),
            })}"
            id="legend-item-${i}"
            role="button"
            tabindex="0"
            aria-pressed="${this.selected === i}"
          >
            <span
              class="dot"
              style="background-color:${matchColor(
                i
              )};border-color:${matchStroke(i) ?? matchColor(i)};"
            ></span
            >${this._groupLabel(group)}${this.labelBy === 'ancestor'
              ? html`<div class="members">${this._groupDetail(group)}</div>`
              : html`<span class="total">${this._groupDetail(group)}</span>`}
          </li>
        `
      )}
    </ul> `
  }

  _renderTooltip(seg) {
    const match = this.data[seg.index] ?? {}
    const numberFormat = this._numberFormat()
    const stats = [
      seg.cM ? html`<b>${numberFormat.format(seg.cM)} cM</b>` : '',
      seg.SNPs ? `${numberFormat.format(seg.SNPs)} SNPs` : '',
    ].filter(Boolean)
    const ancestors = profileNames(match.ancestor_profiles)
    const content = document.createElement('div')
    render(
      html`
        ${this._getNameFromHandle(seg.handle)}<br />
        ${stats.length
          ? html`${stats.map((stat, i) => html`${i ? ', ' : ''}${stat}`)}<br />`
          : ''}
        ${this._('Chromosome')} ${seg.chromosome}:
        ${numberFormat.format(seg.start)}&ndash;${numberFormat.format(
          seg.stop
        )}<br />
        ${ancestors.length
          ? html`${this._('Common ancestors')}: ${ancestors.join(', ')}<br />`
          : ''}
        ${match.relation
          ? html`${this._('Relationship')}: ${match.relation}`
          : ''}
      `,
      content
    )
    return content
  }

  _handleLegendClick(event, i) {
    this.selected = this.selected === i ? -1 : i
    event.preventDefault()
    event.stopPropagation()
  }

  firstUpdated() {
    this._setUpContainer()
  }

  _setUpContainer() {
    const container = this.renderRoot.getElementById('container')
    if (!container || this._tippy) {
      return
    }
    // One delegated instance covers every segment, including those of
    // charts rendered later.
    this._tippy = delegate(container, {
      target: 'rect.segment',
      // tippy also evaluates content for the container itself
      content: reference =>
        reference === container
          ? ''
          : this._renderTooltip(select(reference).datum()),
    })
    container.addEventListener('mouseover', this._handleChartMouseOver)
    container.addEventListener('mouseout', this._handleChartMouseOut)
    container.addEventListener('click', this._handleChartClick)
    this.handleResize()
    this._resizeObserver = new ResizeObserver(() => this.handleResize())
    this._resizeObserver.observe(container)
  }

  _tearDownContainer() {
    const container = this.renderRoot.getElementById('container')
    container?.removeEventListener('mouseover', this._handleChartMouseOver)
    container?.removeEventListener('mouseout', this._handleChartMouseOut)
    container?.removeEventListener('click', this._handleChartClick)
    this._resizeObserver?.disconnect()
    this._resizeObserver = null
    this._tippy?.destroy()
    this._tippy = null
  }

  handleResize() {
    const container = this.renderRoot.getElementById('container')
    const width = Math.max(0, container.clientWidth - 45)
    if (width > 0 && width !== this.width) {
      this.width = width
    }
  }
}

window.customElements.define(
  'grampsjs-chromosome-browser',
  GrampsjsChromosomeBrowser
)
