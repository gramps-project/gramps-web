import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsLifespanChart.js'

export class GrampsjsViewLifespanChart extends GrampsjsViewTreeChartBase {
  constructor() {
    super()
    this._setAnc = true
    this.defaults.nAnc = 3
    this.defaults.nDesc = 0
    this._familyEvents = {}
  }

  static get properties() {
    return {
      ...super.properties,
      _familyEvents: {type: Object},
    }
  }

  get nAnc() {
    return this.appState?.settings?.lifespanChartAnc ?? this.defaults.nAnc
  }

  set nAnc(value) {
    this.appState.updateSettings({lifespanChartAnc: value}, false)
  }

  get nDesc() {
    return 0
  }

  get nameDisplayFormat() {
    return (
      this.appState?.settings?.lifespanChartNameDisplayFormat ??
      this.defaults.nameDisplayFormat
    )
  }

  set nameDisplayFormat(value) {
    this.appState.updateSettings({lifespanChartNameDisplayFormat: value}, false)
  }

  _resetLevels() {
    this.nAnc = this.defaults.nAnc
    this.nameDisplayFormat = this.defaults.nameDisplayFormat
  }

  _getPersonRules(grampsId) {
    return {
      rules: [
        {name: 'IsLessThanNthGenerationAncestorOf', values: [grampsId, this.nAnc + 1]},
      ],
    }
  }

  async _fetchData(grampsId) {
    await super._fetchData(grampsId)
    const handles = new Set()
    this._data.forEach(person => {
      ;(person?.extended?.families ?? []).forEach(fam => {
        ;(fam.event_ref_list ?? []).forEach(ref => handles.add(ref.ref))
      })
    })
    if (!handles.size) {
      this._familyEvents = {}
      return
    }
    const result = await this.appState.apiGet(
      `/api/events/?handles=${[...handles].join(',')}&keys=handle,type,date`
    )
    this._familyEvents = 'data' in result
      ? Object.fromEntries(result.data.map(event => [event.handle, event]))
      : {}
  }

  renderChart() {
    return html`
      <grampsjs-lifespan-chart
        grampsId=${this.grampsId}
        depth=${this.nAnc + 1}
        .data=${this._data}
        .familyEvents=${this._familyEvents}
        .appState="${this.appState}"
        nameDisplayFormat=${this.nameDisplayFormat}
      >
      </grampsjs-lifespan-chart>
    `
  }
}

window.customElements.define(
  'grampsjs-view-lifespan-chart',
  GrampsjsViewLifespanChart
)
