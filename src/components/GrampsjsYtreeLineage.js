import {html, css, LitElement} from 'lit'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {YtreeLineageChart} from '../charts/YtreeLineageChart.js'
import {personDisplayName} from '../util.js'

class GrampsjsYtreeLineage extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [sharedStyles, css``]
  }

  static get properties() {
    return {
      data: {type: Array},
      person: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = []
    this.person = {}
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
    for (let i = 0; i < this.data.length; i += 1) {
      const clade = this.data[i]
      result.push({
        name: clade.name,
        year: formatYear(clade.age_info?.formed ?? ''),
        connectorText: '',
      })
      // connectorText for next connector
      if (i < this.data.length - 1) {
        const formedCurrent = Number(clade.age_info?.formed ?? '')
        const formedNext = Number(this.data[i + 1]?.age_info?.formed ?? '')
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
          nGen !== '' ? `${nGen === 0 ? 'few' : `≈ ${nGen}`} generations` : ''
      }
    }
    // MRCA box
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
          year: formatYear(
            lastClade.age_info?.most_recent_common_ancestor ?? ''
          ),
          connectorText: '',
        })
        result[result.length - 2].connectorText = `${
          nGen === 0 ? 'few' : `≈ ${nGen}`
        } generations`
      }
    }
    // person box
    result.push({
      name: personDisplayName(this.person),
      year: '1982',
      connectorText: '',
    })
    return result
  }

  render() {
    // Use d3-based chart rendering
    let svgNode = null
    const chartData = this.getChartData()
    if (chartData.length > 0) {
      svgNode = YtreeLineageChart(chartData)
    }
    return html`<div>${svgNode ? html`${svgNode}` : ''}</div>`
  }
}

window.customElements.define('grampsjs-ytree-lineage', GrampsjsYtreeLineage)
