import {html, css, LitElement} from 'lit'
import {mdiUnfoldMoreHorizontal, mdiUnfoldLessHorizontal} from '@mdi/js'

import '@material/web/iconbutton/filled-tonal-icon-button.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {YtreeLineageChart} from '../charts/YtreeLineageChart.js'
import {fireEvent, personDisplayName} from '../util.js'
import {getImageUrl} from '../charts/util.js'
import './GrampsjsIcon.js'
import './GrampsjsTooltip.js'

// The page of a clade in the YFull tree, which the lineage comes from
export const yfullCladeUrl = name =>
  `https://yfull.com/tree/${encodeURIComponent(name)}`

const birthYear = person =>
  person?.extended?.events?.[person?.birth_ref_index]?.date?.year

// Returns the handle of the father in the first parent family where the
// person is the father's birth child, who passed on the Y chromosome
export function biologicalFatherHandle(person) {
  const family = (person?.extended?.parent_families ?? []).find(
    ({father_handle: father, child_ref_list: childRefs}) => {
      const childRef = (childRefs ?? []).find(ref => ref.ref === person.handle)
      return father && (childRef?.frel || 'Birth') === 'Birth'
    }
  )
  return family?.father_handle ?? null
}

export class GrampsjsYtreeLineage extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        /* centred on the boxes, which start 20 units into the 370 unit wide
           chart and are 250 wide; a share of the width, so it stays centred
           when the chart shrinks on narrow screens */
        .expand-button {
          position: absolute;
          top: -5px;
          left: calc(145 / 370 * 100%);
          transform: translateX(-50%);
          z-index: 1;
        }

        .container {
          position: relative;
          width: max-content;
          max-width: 100%;
          padding-top: 40px;
        }

        svg {
          display: block;
          max-width: 100%;
          height: auto;
        }

        svg a.box-link:hover rect {
          fill: var(--grampsjs-body-font-color-10);
        }

        svg a.box-link:focus {
          outline: none;
        }

        svg a.box-link:focus-visible rect {
          stroke: var(--md-sys-color-secondary);
          stroke-width: 3px;
        }

        md-filled-tonal-icon-button {
          --md-filled-tonal-icon-button-container-color: var(
            --grampsjs-color-ytree-expand-background
          );
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      person: {type: Object},
      expanded: {type: Boolean},
      _ancestors: {state: true},
    }
  }

  constructor() {
    super()
    this.data = []
    this.person = {}
    this.expanded = false
    this._ancestors = []
    this._ancestorSeq = 0
  }

  _formatNGenerations(nGen) {
    if (nGen === 0) return this._('few generations')
    return `≈ ${this._('%s generations', nGen)}`
  }

  getChartData() {
    const locale = this.appState?.i18n?.lang ?? 'en-US'
    const formatYear = yearBeforePresentString => {
      if (!yearBeforePresentString) return ''
      let year = Math.round(2000 - Number(yearBeforePresentString))
      if (Number.isNaN(year)) return ''
      if (year < 0) year += 1
      // Date.UTC would read years 0 to 99 as 1900 to 1999
      const date = new Date(0)
      date.setUTCFullYear(year, 0, 1)
      const options = {year: 'numeric', ...(year <= 0 && {era: 'short'})}
      let formatter
      try {
        formatter = new Intl.DateTimeFormat(locale.replace('_', '-'), options)
      } catch (_) {
        formatter = new Intl.DateTimeFormat('en-US', options)
      }
      return formatter.format(date)
    }

    const result = []
    // When collapsed, only show last 2 clades + MRCA + person = 4 boxes total
    const dataToProcess = this.expanded ? this.data : this.data.slice(-2)

    for (let i = 0; i < dataToProcess.length; i += 1) {
      const clade = dataToProcess[i]
      result.push({
        name: clade.name,
        year: `≈ ${formatYear(clade.age_info?.formed ?? '')}`,
        connectorText: '',
        url: yfullCladeUrl(clade.name),
      })
      // connectorText for next connector
      if (i < dataToProcess.length - 1) {
        const formedCurrent = Number(clade.age_info?.formed ?? '')
        const formedNext = Number(dataToProcess[i + 1]?.age_info?.formed ?? '')
        let nGen = ''
        if (
          !Number.isNaN(formedCurrent) &&
          !Number.isNaN(formedNext) &&
          formedCurrent > 0 &&
          formedNext > 0
        ) {
          nGen = Math.round(Math.abs(formedCurrent - formedNext) / 20)
        }
        result[result.length - 1].connectorText =
          nGen !== '' ? this._formatNGenerations(nGen) : ''
      }
    }
    // MRCA box
    let mrcaAdded = false
    if (
      this.data.length > 0 &&
      this.data[this.data.length - 1]?.age_info?.most_recent_common_ancestor
    ) {
      const lastClade = this.data[this.data.length - 1]
      const formed = Number(lastClade.age_info?.formed ?? '')
      const mrca = Number(lastClade.age_info?.most_recent_common_ancestor ?? '')
      if (
        !Number.isNaN(formed) &&
        !Number.isNaN(mrca) &&
        formed > 0 &&
        mrca > 0 &&
        formed !== mrca
      ) {
        const nGen = Math.round(Math.abs(formed - mrca) / 20)
        result.push({
          name: `${lastClade.name} MRCA`,
          year: `≈ ${formatYear(
            lastClade.age_info?.most_recent_common_ancestor ?? ''
          )}`,
          connectorText: '',
        })
        result[result.length - 2].connectorText = this._formatNGenerations(nGen)
        mrcaAdded = true
      }
    }
    // boxes of the documented paternal line, oldest first, and the person
    const lastCladeIndex = result.length - 1
    const people = [...this._ancestors].reverse().concat(this.person)
    people.forEach((person, i) => {
      result.push({
        name: personDisplayName(person),
        year: `${birthYear(person) || ''}`,
        connectorText: '',
        documented: i < people.length - 1,
        person,
      })
    })

    // generations from the last clade to the oldest documented ancestor,
    // counted from the oldest person with a known birth year
    if (lastCladeIndex >= 0) {
      const lastClade = this.data[this.data.length - 1]
      // clade ages are in years before 2000, birth years are calendar years
      const lastCladeYbp = Number(
        mrcaAdded
          ? lastClade?.age_info?.most_recent_common_ancestor
          : lastClade?.age_info?.formed
      )
      const datedIndex = people.findIndex(person => birthYear(person))
      if (lastCladeYbp > 0 && datedIndex >= 0) {
        const years =
          Number(birthYear(people[datedIndex])) - (2000 - lastCladeYbp)
        const nGen = Math.max(0, Math.round(years / 20) - datedIndex)
        result[lastCladeIndex].connectorText = this._formatNGenerations(nGen)
      }
    }

    return result
  }

  willUpdate(changed) {
    if (changed.has('person')) {
      this._ancestors = []
      this._fetchPaternalAncestors()
    }
  }

  // Loads the documented paternal line of the person, father first
  async _fetchPaternalAncestors() {
    this._ancestorSeq += 1
    const seq = this._ancestorSeq
    const ancestors = []
    const visited = new Set()
    let handle = this.person?.handle
    if (!handle) return
    while (handle && !visited.has(handle) && ancestors.length < 100) {
      visited.add(handle)
      // each generation needs the father found in the previous one
      // eslint-disable-next-line no-await-in-loop
      const res = await this.appState.apiGet(
        `/api/people/${handle}?extend=event_ref_list,parent_family_list`
      )
      if (seq !== this._ancestorSeq) return
      if ('error' in res) {
        fireEvent(this, 'grampsjs:error', {message: res.error})
        break
      }
      if (handle !== this.person.handle) ancestors.push(res.data)
      handle = biologicalFatherHandle(res.data)
    }
    this._ancestors = ancestors
  }

  render() {
    // Use d3-based chart rendering
    let svgNode = null
    const chartData = this.getChartData()
    if (chartData.length > 0) {
      svgNode = YtreeLineageChart(chartData, {
        getImageUrl: d => getImageUrl(d?.person || {}, 100),
        onClick: d =>
          fireEvent(this, 'nav', {path: `person/${d.person.gramps_id}`}),
      })
    }

    // Collapsed, only the last 2 clades are shown
    const showExpandButton = this.data.length > 2

    return html`
      <div class="container">
        ${showExpandButton
          ? html`
              <div class="expand-button">
                <md-filled-tonal-icon-button
                  @click="${this._toggleExpanded}"
                  id="expand-button"
                  aria-label="${this.expanded
                    ? this._('Show less')
                    : this._('Show all')}"
                >
                  <grampsjs-icon
                    style="width:24px; height:24px;"
                    path="${this.expanded
                      ? mdiUnfoldLessHorizontal
                      : mdiUnfoldMoreHorizontal}"
                    color="var(--grampsjs-color-ytree-expand-font)"
                  ></grampsjs-icon>
                </md-filled-tonal-icon-button>
                <grampsjs-tooltip
                  for="expand-button"
                  .content="${this.expanded
                    ? this._('Show less')
                    : this._('Show all')}"
                >
                </grampsjs-tooltip>
              </div>
            `
          : ''}
        <div>${svgNode ? html`${svgNode}` : ''}</div>
      </div>
    `
  }

  _toggleExpanded() {
    this.expanded = !this.expanded
  }
}

window.customElements.define('grampsjs-ytree-lineage', GrampsjsYtreeLineage)
