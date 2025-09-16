import {css, html} from 'lit'

import '@material/mwc-linear-progress'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'

function _getProgress(usage, quota) {
  if (usage === undefined || quota === undefined) {
    return 0
  }
  if (usage === 0) {
    return 0
  }
  if (quota === null) {
    return 0
  }
  return usage / quota
}

function formatBytes(bytes) {
  if (bytes === null) {
    return null
  }
  if (bytes === 0) {
    return '0 B'
  }
  const prefixes = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']
  const base = 1000
  const exponent = Math.floor(Math.log10(bytes) / Math.log10(base))

  return `${(bytes / base ** exponent).toFixed(1)} ${prefixes[exponent]}B`
}

export class GrampsjsTreeQuotas extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      sharedStyles,
      css`
        mwc-linear-progress {
        }

        span.label {
        }

        div.progress {
          max-width: 100px;
          height: 20px;
          margin-left: 20px;
        }

        th,
        td {
          font-size: 14px;
          font-weight: 300;
          height: 20px;
          padding-bottom: 10px;
          padding-top: 10px;
          padding-right: 25px;
          padding-left: 0;
          text-align: left;
        }

        th {
          font-weight: 450;
          color: var(--md-sys-color-on-surface);
          text-align: right;
        }

        td.progress {
          width: 100px;
        }

        td.numbers {
          font-size: 14px;
        }
      `,
    ]
  }

  renderContent() {
    const {data} = this._data
    if (!data) {
      return html`${this._('Error')}`
    }
    const usagePeople =
      data.usage_people === undefined || data.usage_people === null
        ? this._('unknown')
        : data.usage_people
    const quotaPeople =
      'quota_people' in data
        ? data.quota_people || html`&infin;`
        : this._('unknown')
    const usageMedia =
      data.usage_media === undefined || data.usage_media === null
        ? this._('unknown')
        : formatBytes(data.usage_media)
    const quotaMedia =
      'quota_media' in data
        ? formatBytes(data.quota_media) || html`&infin;`
        : this._('unknown')
    const usageAi =
      data.usage_ai === undefined || data.usage_ai === null
        ? this._('unknown')
        : data.usage_ai
    const quotaAi =
      'quota_ai' in data ? data.quota_ai || html`&infin;` : this._('unknown')
    const progressPeople = _getProgress(data.usage_people, data.quota_people)
    const progressMedia = _getProgress(data.usage_media, data.quota_media)
    const progressAi = _getProgress(data.usage_ai, data.quota_ai)
    return html`
      <table>
        <tr>
          <th>${this._('Number of people')}</th>
          <td class="progress">
            <mwc-linear-progress
              progress="${progressPeople}"
            ></mwc-linear-progress>
          </td>
          <td class="numbers">
            ${Math.round(100 * progressPeople)}%
            (&hairsp;${usagePeople}&thinsp;/&thinsp;${quotaPeople}&hairsp;)
          </td>
        </tr>
        <tr>
          <th>${this._('Total size of media objects')}</th>
          <td class="progress">
            <mwc-linear-progress
              progress="${progressMedia}"
            ></mwc-linear-progress>
          </td>
          <td class="numbers">
            ${Math.round(100 * progressMedia)}%
            (&hairsp;${usageMedia}&thinsp;/&thinsp;${quotaMedia}&hairsp;)
          </td>
        </tr>
        ${'usage_ai' in data
          ? html`
              <tr>
                <th>${this._('Chat messages')}</th>
                <td class="progress">
                  <mwc-linear-progress
                    progress="${progressAi}"
                  ></mwc-linear-progress>
                </td>
                <td class="numbers">
                  ${Math.round(100 * progressAi)}%
                  (&hairsp;${usageAi}&thinsp;/&thinsp;${quotaAi}&hairsp;)
                </td>
              </tr>
            `
          : ''}
      </table>
    `
  }

  renderLoading() {
    return html`
      <table>
        <tr>
          <th>${this._('Number of people')}</th>
          <td class="progress">
            <mwc-linear-progress indeterminate></mwc-linear-progress>
          </td>
          <td class="numbers">
            <span class="skeleton" style="width: 6em;">&nbsp;</span>
          </td>
        </tr>
        <tr>
          <th>${this._('Total size of media objects')}</th>
          <td class="progress">
            <mwc-linear-progress indeterminate></mwc-linear-progress>
          </td>
          <td class="numbers">
            <span class="skeleton" style="width: 7em;">&nbsp;</span>
          </td>
        </tr>
      </table>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    return '/api/trees/-'
  }
}

window.customElements.define('grampsjs-tree-quotas', GrampsjsTreeQuotas)
