import {html, css, LitElement} from 'lit'
import {mdiUnfoldMoreHorizontal, mdiUnfoldLessHorizontal} from '@mdi/js'

import '@material/web/iconbutton/filled-tonal-icon-button.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {YtreeLineageChart} from '../charts/YtreeLineageChart.js'
import {personDisplayName} from '../util.js'
import {getImageUrl} from '../charts/util.js'
import './GrampsjsIcon.js'
import './GrampsjsTooltip.js'

class GrampsjsYtreeLineage extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .expand-button {
          position: absolute;
          top: -5px;
          left: 145px;
          transform: translateX(-50%);
          z-index: 1;
        }

        .container {
          position: relative;
          padding-top: 40px;
        }

        md-filled-tonal-icon-button {
          --md-filled-tonal-icon-button-container-color: #eee;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      person: {type: Object},
      expanded: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = []
    this.person = {}
    this.expanded = false
  }

  _formatNGenerations(nGen) {
    if (nGen === 0) return `≈ ${this._('few generations')}`
    return `≈ ${this._('%s generations', nGen)}`
  }

  getChartData() {
    const locale = this.appState?.i18n?.lang ?? 'en-US'
    const formatYear = yearBeforePresentString => {
      if (!yearBeforePresentString) return ''
      let year = Math.round(2000 - Number(yearBeforePresentString))
      if (Number.isNaN(year)) return ''
      if (year < 0) year += 1
      const date = new Date(Date.UTC(year, 0, 1))
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
    // person box
    const birthYear =
      this.person?.extended?.events?.[this.person?.birth_ref_index]?.date?.year
    result.push({
      name: personDisplayName(this.person),
      year: `${birthYear || ''}`,
      connectorText: '',
      person: this.person,
    })

    // Add connector text from next-to-last box to person box
    if (result.length >= 2) {
      const nextToLastIndex = result.length - 2
      const lastClade = this.data[this.data.length - 1]
      const lastCladeYear = mrcaAdded
        ? lastClade?.age_info?.most_recent_common_ancestor
        : lastClade?.age_info?.formed
      if (lastCladeYear && birthYear) {
        const nGen = Math.round(
          Math.abs(Number(lastCladeYear) - Number(birthYear)) / 20
        )
        result[nextToLastIndex].connectorText = `${
          nGen === 0 ? 'few' : `≈ ${nGen}`
        } generations`
      }
    }

    return result
  }

  render() {
    // Use d3-based chart rendering
    let svgNode = null
    const chartData = this.getChartData()
    if (chartData.length > 0) {
      svgNode = YtreeLineageChart(chartData, {
        getImageUrl: d => getImageUrl(d?.person || {}, 200),
      })
    }

    // Only show expand button if there are more than 4 items total (3 clades + person)
    const showExpandButton = this.data.length > 3

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
                    color="#555"
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
