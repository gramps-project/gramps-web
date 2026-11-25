import {html, LitElement, css} from 'lit'
import '@material/web/button/text-button.js'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import {segmentsCsv} from './GrampsjsDnaMatchTable.js'
import './GrampsjsFormEditMatch.js'
import './GrampsjsConnectionChart.js'
import {personDisplayName} from '../util.js'
import './GrampsjsObjectLink.js'
import './GrampsjsDownloadButton.js'
import {renderPrivacyIcon, rowPrivacy} from '../objectRender.js'
import {matchAssociation} from '../dnaMatch.js'
import {
  conflictWarning,
  groupLabel,
  matchRelationshipEstimate,
  sharedPercent,
  supportsRelationshipEstimate,
} from '../dnaRelationship.js'

// Relationships with a lower probability are not listed
const MIN_LISTED_PROBABILITY = 0.01
// Relationships listed before "Show more"
const COLLAPSED_GROUPS = 4

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

        .summary {
          padding-top: 0;
        }

        .section-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          --grampsjs-icon-button-color: var(--grampsjs-body-font-color-60);
        }

        .estimate .alert {
          font-size: 1em;
        }

        /* Same typography as the wide grampsjs-table */
        .estimate table {
          border-collapse: collapse;
          color: var(--grampsjs-body-font-color-87);
          font-variant-numeric: tabular-nums;
        }

        .estimate td {
          padding: 12px 16px;
          font-size: 15px;
          vertical-align: middle;
        }

        .estimate tr + tr td {
          border-top: 1px solid var(--grampsjs-divider-color);
        }

        .estimate .percent {
          text-align: right;
          padding-right: 8px;
        }

        .estimate .bar {
          padding-left: 0;
        }

        .estimate .track {
          width: 120px;
          height: 8px;
          border-radius: 4px;
          background-color: var(--md-sys-color-surface-container-highest);
        }

        .estimate .fill {
          height: 100%;
          border-radius: 4px;
          background-color: var(--grampsjs-body-font-color-40);
        }

        .estimate tr.first .fill {
          background-color: var(--md-sys-color-primary);
        }

        .estimate .more {
          margin-top: 12px;
        }

        @media (max-width: 600px) {
          .estimate .bar {
            display: none;
          }
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
      _showAllGroups: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.person = {}
    this.personMatch = {}
    this.edit = false
    this._showAllGroups = false
  }

  render() {
    if (Object.keys(this.data).length === 0) {
      return ''
    }
    // Only the segments can be edited, so the editor is all there is
    if (this.edit) {
      return html`
        <div class="container">
          <grampsjs-form-edit-match
            helpPath="user-guide/dna-matches/"
            .appState="${this.appState}"
            @object:save="${this._handleSaveMatch}"
            .data="${this.data}"
            .personHandle="${this.person.handle}"
            .association="${this._association}"
          ></grampsjs-form-edit-match>
        </div>
      `
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
        >${renderPrivacyIcon(rowPrivacy(this._association), this.appState)}
      </h3>

      <div class="container summary">
        <dl>
          <div>
            <dt>${this._('Shared DNA')}</dt>
            <dd>
              ${this._formatCm(
                this.data.segments.reduce((sum, seg) => sum + seg.cM, 0)
              )}
              cM${this._renderSharedPercent()}
            </dd>
          </div>
          <div>
            <dt>${this._('Shared Segments')}</dt>
            <dd>${this._formatNumber(this.data.segments.length)}</dd>
          </div>
          <div>
            <dt>${this._('Largest Segment')}</dt>
            <dd>
              ${this._formatCm(
                this.data.segments.reduce(
                  (max, seg) => Math.max(max, seg.cM),
                  0
                )
              )}
              cM
            </dd>
          </div>
          <div>
            <dt>${this._('Relationship')}</dt>
            <dd>${this.data.relation || this._('Unknown')}</dd>
          </div>
          ${this._estimate?.estimate
            ? html`<div>
                <dt>${this._('Estimated relationship')}</dt>
                <dd>
                  ${groupLabel(
                    this._estimate.estimate.groups[0].group,
                    (...args) => this._(...args)
                  )}
                </dd>
              </div>`
            : ''}
        </dl>
      </div>

      ${this._renderEstimate()}
      ${this.data.relation
        ? html`
            <div class="container">
              <div class="section-heading">
                <h4>${this._('Relationship Graph')}</h4>
                <grampsjs-download-button
                  filename="${this._svgFilename()}"
                  mimeType="image/svg+xml"
                  .content=${() => this._connectionChartSvg()}
                  .appState="${this.appState}"
                ></grampsjs-download-button>
              </div>
              <grampsjs-connection-chart
                .appState="${this.appState}"
                .grampsId1="${this.person.gramps_id}"
                .grampsId2="${this.personMatch.gramps_id}"
              ></grampsjs-connection-chart>
            </div>
          `
        : ''}

      <div class="container">
        <div class="section-heading">
          <h4>${this._('Raw match data')}</h4>
          <grampsjs-download-button
            filename="${this._segmentsFilename()}"
            mimeType="text/csv"
            .content=${() => segmentsCsv(this.data.segments ?? [])}
            .appState="${this.appState}"
          ></grampsjs-download-button>
        </div>
        <grampsjs-dna-match-table
          .appState="${this.appState}"
          .segments="${this.data.segments}"
        ></grampsjs-dna-match-table>
      </div>
    `
  }

  // The association of the person that records the match
  get _association() {
    return matchAssociation(this.person, this.data)
  }

  // The estimate from the shared DNA, or null if the backend does not
  // support it
  get _estimate() {
    if (!supportsRelationshipEstimate(this.appState?.dbInfo)) {
      return null
    }
    return matchRelationshipEstimate(this.data)
  }

  get _locale() {
    return (this.appState?.i18n?.lang || 'en').replace('_', '-')
  }

  _formatCm(value) {
    return new Intl.NumberFormat(this._locale, {
      maximumFractionDigits: 1,
    }).format(value)
  }

  _formatNumber(value) {
    return new Intl.NumberFormat(this._locale).format(value)
  }

  _renderSharedPercent() {
    const percent = sharedPercent(this.data.segments)
    if (percent === null) {
      return ''
    }
    const locale = (this.appState?.i18n?.lang || 'en').replace('_', '-')
    const format = new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 1,
    })
    return ` (${format.format(percent)})`
  }

  _renderEstimate() {
    const {estimate, check} = this._estimate ?? {}
    if (!estimate) {
      return ''
    }
    const locale = (this.appState?.i18n?.lang || 'en').replace('_', '-')
    const formatPercent = new Intl.NumberFormat(locale, {style: 'percent'})
    const listed = estimate.groups.filter(
      ({probability}) => probability >= MIN_LISTED_PROBABILITY
    )
    const groups = this._showAllGroups
      ? listed
      : listed.slice(0, COLLAPSED_GROUPS)
    return html`
      <div class="container estimate">
        <h4>${this._('Estimated relationship')}</h4>
        ${check?.conflict
          ? html`<p class="alert warn">
              ${conflictWarning(check, (...args) => this._(...args), locale)}
            </p>`
          : ''}
        <table>
          <tbody>
            ${groups.map(
              ({group, probability}, index) => html`
                <tr class="${index === 0 ? 'first' : ''}">
                  <td>${groupLabel(group, (...args) => this._(...args))}</td>
                  <td class="percent">${formatPercent.format(probability)}</td>
                  <td class="bar">
                    <div class="track">
                      <div
                        class="fill"
                        style="width: ${(probability * 100).toFixed(1)}%"
                      ></div>
                    </div>
                  </td>
                </tr>
              `
            )}
          </tbody>
        </table>
        ${listed.length > COLLAPSED_GROUPS
          ? html`<md-text-button
              class="more"
              @click="${() => {
                this._showAllGroups = !this._showAllGroups
              }}"
              >${this._showAllGroups
                ? this._('Show less')
                : this._('Show more')}</md-text-button
            >`
          : ''}
      </div>
    `
  }

  // The segments are saved to a file named after both people
  _segmentsFilename() {
    return `${this.person.gramps_id}-${this.personMatch.gramps_id}.csv`
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
}

window.customElements.define('grampsjs-dna-match', GrampsjsDnaMatch)
