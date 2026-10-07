import {html, LitElement, css} from 'lit'
import {mdiArrowLeft} from '@mdi/js'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsDnaMatchTable.js'
import './GrampsjsFormEditMatch.js'
import './GrampsjsConnectionChart.js'
import {personDisplayName, fireEvent} from '../util.js'
import './GrampsjsObjectLink.js'
import './GrampsjsSvgDownloadButton.js'
import {renderIconSvg} from '../icons.js'

export class GrampsjsDnaMatch extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .container {
          padding-top: 20px;
          padding-bottom: 20px;
          clear: left;
        }

        .chart-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          --grampsjs-icon-button-color: var(--grampsjs-body-font-color-60);
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      person: {type: Object},
      personMatch: {type: Object},
      edit: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.person = {}
    this.personMatch = {}
    this.edit = false
  }

  render() {
    if (Object.keys(this.data).length === 0) {
      return ''
    }
    return html`
      <h3>
        ${this._('DNA Match')}:
        <grampsjs-object-link
          object-type="person"
          gramps-id="${this.person.gramps_id}"
          >${personDisplayName(this.person)}</grampsjs-object-link
        >
        &amp;
        <grampsjs-object-link
          object-type="person"
          gramps-id="${this.personMatch.gramps_id}"
          >${personDisplayName(this.personMatch)}</grampsjs-object-link
        >
      </h3>

      <div class="container">
      <dl>
        <div>
          <dt>${this._('Shared DNA')}</dt>
          <dd>${this.data.segments
            .reduce(
              (accumulator, currentValue) => accumulator + currentValue.cM,
              0
            )
            .toFixed(1)} cM</dd>
        </div>
        <div>
          <dt>${this._('Relationship')}</dt>
          <dd>${this.data.relation || this._('Unknown')}</dd>
        </div>
        <div>
      </dl>
      </div>

      <div class="container">
        <h4>${this._('Raw match data')}</h4>
        ${
          this.edit
            ? html`
                <grampsjs-form-edit-match
                  .appState="${this.appState}"
                  @object:save="${this._handleSaveMatch}"
                  .data="${this.data}"
                ></grampsjs-form-edit-match>
              `
            : html`
                <grampsjs-dna-match-table
                  .appState="${this.appState}"
                  .segments="${this.data.segments}"
                ></grampsjs-dna-match-table>
              `
        }
      </div>

      ${
        this.data.relation
          ? html`
              <div class="container">
                <div class="chart-heading">
                  <h4>${this._('Relationship Graph')}</h4>
                  <grampsjs-svg-download-button
                    filename="${this._svgFilename()}"
                    .svgDocument=${() => this._connectionChartSvg()}
                    .appState="${this.appState}"
                  ></grampsjs-svg-download-button>
                </div>
                <grampsjs-connection-chart
                  .appState="${this.appState}"
                  .grampsId1="${this.person.gramps_id}"
                  .grampsId2="${this.personMatch.gramps_id}"
                ></grampsjs-connection-chart>
              </div>
            `
          : ''
      }

      <div class="container">
        <md-icon-button @click="${this.handleBackToAllMatches}">
          <md-icon>${renderIconSvg(
            mdiArrowLeft,
            'var(--grampsjs-body-font-color-60)'
          )}</md-icon>
        </md-icon-button>
      </div>
    `
  }

  // The relationship graph is saved to a file named after both people
  _svgFilename() {
    return `${this.person.gramps_id}-${this.personMatch.gramps_id}.svg`
  }

  _connectionChartSvg() {
    return (
      this.renderRoot
        .querySelector('grampsjs-connection-chart')
        ?.svgDocument() ?? null
    )
  }

  handleBackToAllMatches() {
    const path = `dna-matches/${this.person.gramps_id}`
    fireEvent(this, 'nav', {path})
  }
}

window.customElements.define('grampsjs-dna-match', GrampsjsDnaMatch)
