import {html, css} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsRelationshipChart.js'
import '../components/GrampsjsTreeChartAddPerson.js'

export class GrampsjsViewRelationshipChart extends GrampsjsViewTreeChartBase {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
        }
      `,
    ]
  }

  constructor() {
    super()
    this._setSep = true
    this._setMaxImages = true
    this._setShowUnionDates = true
    this.color = ''
    this.defaults.nAnc = 2
    this.defaults.showUnionDates = false
  }

  get nAnc() {
    return this.appState?.settings?.relationshipChartAnc ?? this.defaults.nAnc
  }

  set nAnc(value) {
    this.appState.updateSettings({relationshipChartAnc: value}, false)
  }

  get nMaxImages() {
    return (
      this.appState?.settings?.relationshipChartMaxImages ??
      this.defaults.nMaxImages
    )
  }

  set nMaxImages(value) {
    this.appState.updateSettings({relationshipChartMaxImages: value}, false)
  }

  get nameDisplayFormat() {
    return (
      this.appState?.settings?.relationshipChartNameDisplayFormat ??
      this.defaults.nameDisplayFormat
    )
  }

  set nameDisplayFormat(value) {
    this.appState.updateSettings(
      {relationshipChartNameDisplayFormat: value},
      false
    )
  }

  get showUnionDates() {
    return (
      this.appState?.settings?.relationshipChartShowUnionDates ??
      this.defaults.showUnionDates
    )
  }

  set showUnionDates(value) {
    this.appState.updateSettings(
      {relationshipChartShowUnionDates: value},
      false
    )
  }

  _resetLevels() {
    this.nAnc = this.defaults.nAnc
    this.nMaxImages = this.defaults.nMaxImages
    this.nameDisplayFormat = this.defaults.nameDisplayFormat
    this.showUnionDates = this.defaults.showUnionDates
  }

  _getPersonRules(grampsId) {
    return {
      function: 'or',
      rules: [
        {
          name: 'DegreesOfSeparation',
          values: [grampsId, this.nAnc],
        },
      ],
    }
  }

  renderChart() {
    return html`
      <div @add-new-person-relation="${this._handleAddPersonRelation}">
        <grampsjs-relationship-chart
          grampsId=${this.grampsId}
          nAnc=${this.nAnc + 1}
          nMaxImages=${this.nMaxImages}
          nameDisplayFormat=${this.nameDisplayFormat}
          ?showUnionDates=${this.showUnionDates}
          ?canEdit="${this._editMode}"
          .data=${this._data}
        >
        </grampsjs-relationship-chart>
      </div>
    `
  }

  renderContent() {
    return html`
      ${super.renderContent()}
      <grampsjs-tree-chart-add-person
        .appState="${this.appState}"
      ></grampsjs-tree-chart-add-person>
    `
  }
}

window.customElements.define(
  'grampsjs-view-relationship-chart',
  GrampsjsViewRelationshipChart
)
