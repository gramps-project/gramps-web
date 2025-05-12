import {css, html} from 'lit'

import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import {RelationshipChart} from '../charts/RelationshipChart.js'
import {GrampsjsResizeContainerMixin} from '../mixins/GrampsjsResizeContainerMixin.js'
import {getImageUrl} from '../charts/util.js'

export class GrampsjsConnectionChart extends GrampsjsResizeContainerMixin(
  GrampsjsConnectedComponent
) {
  static get styles() {
    return [
      super.styles,
      css`
        svg a {
          text-decoration: none !important;
        }

        svg .personBox {
          fill: #e6e6e6;
        }

        div#container {
          border: 2px solid rgba(137, 107, 94, 0.4);
          border-radius: 16px;
          overflow: hidden;
          width: 100%;
          resize: vertical;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId1: {type: String},
      grampsId2: {type: String},
      initialHeight: {type: Number},
    }
  }

  constructor() {
    super()
    this.grampsId1 = ''
    this.grampsId2 = ''
    this.initialHeight = 400
  }

  renderContent() {
    if (this._data?.data?.length === 0 || !this.grampsId1 || !this.grampsId2) {
      return html`<div id="container"></div>`
    }
    const chart = RelationshipChart(this._data.data, {
      maxImages: this.nMaxImages,
      grampsId: this.grampsId1,
      getImageUrl: d => getImageUrl(d?.data || {}, 200),
      bboxWidth: this.containerWidth,
      bboxHeight: this.containerHeight,
      shrinkToFit: true,
      nameDisplayFormat: this.nameDisplayFormat,
    })
    return html`
      <div id="container" style="height: ${this.initialHeight}px">${chart}</div>
    `
  }

  renderLoading() {
    return html` <div
      id="container"
      style="height: ${this.initialHeight}px"
      class="skeleton"
    ></div>`
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    const rules = {
      rules: [
        {
          name: 'RelationshipPathBetween',
          values: [this.grampsId1, this.grampsId2],
        },
      ],
    }
    return `/api/people/?rules=${encodeURIComponent(
      JSON.stringify(rules)
    )}&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=self&extend=event_ref_list,primary_parent_family,family_list`
  }
}

window.customElements.define(
  'grampsjs-connection-chart',
  GrampsjsConnectionChart
)
