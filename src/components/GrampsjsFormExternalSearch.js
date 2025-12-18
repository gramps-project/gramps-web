/* eslint-disable class-methods-use-this */
/*
Form to get parameters for find more details about a person from other websites
*/

import {css, html} from 'lit'
import '@material/mwc-icon'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'
import {mdiOpenInNew, mdiEarth, mdiShieldAccount, mdiLock} from '@mdi/js'
import {renderIcon} from '../icons.js'
import './GrampsjsFormSelectType.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

const EXTERNAL_SEARCH_WEBSITES = [
  {
    key: 'comgen',
    value: 'CompGen',
    websiteCriteria: {
      reqRegistration: false,
      reqSubscription: false,
    },
    baseUrl: 'https://meta.genealogy.net/search',
    params: '?lastname={{name_surname}}&place={{place_name}}',
  },
  {
    key: 'familySearch',
    value: 'FamilySearch',
    websiteCriteria: {
      reqRegistration: true,
      reqSubscription: false,
    },
    baseUrl: 'https://familysearch.org/en/search/tree/results',
    params:
      '?q.anyPlace={{place_name}}&q.givenName={{name_given}}&q.surname={{name_surname}}',
  },
  {
    key: 'ancestry',
    value: 'Ancestry',
    websiteCriteria: {
      reqRegistration: false,
      reqSubscription: true,
    },
    baseUrl: 'https://www.ancestry.com/search',
    params:
      '?name={{name_given}}_{{name_surname}}&event={{place_name}}&searchMode=advanced',
  },
]

class GrampsjsFormExternalSearch extends GrampsjsObjectForm {
  static get styles() {
    return [
      super.styles,
      css`
        .button-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5em;
          margin-bottom: 10px;
        }
        .meta-icon {
          display: inline-flex;
          align-items: center;
        }
        .meta-icon svg {
          height: 0.8em;
          margin-bottom: 2px;
        }
        .legend {
          display: flex;
          gap: 1em;
          margin-top: 1em;
          margin-bottom: 0;
          padding-top: 1em;
          border-top: 1px solid var(--grampsjs-body-font-color-10);
          font-size: 0.9em;
          color: var(--grampsjs-body-font-color-70);
          flex-wrap: wrap;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.3em;
        }
        .legend-item svg {
          height: 0.9em;
          margin-bottom: 1px;
        }
      `,
    ]
  }

  interpolateTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || '')
  }

  getExternalSearchWebsitesData() {
    return EXTERNAL_SEARCH_WEBSITES.map(website => ({
      ...website,
      baseUrl: this.interpolateTemplate(website.baseUrl, this.data),
      params: this.interpolateTemplate(website.params, this.data),
    }))
  }

  getWebCriteriaIcon(websiteCriteria) {
    if (websiteCriteria.reqSubscription) return mdiLock
    if (websiteCriteria.reqRegistration) return mdiShieldAccount
    return mdiEarth
  }

  renderForm() {
    const searchWebUrls = this.getExternalSearchWebsitesData()

    return html`
      <div>
        <span>
          ${this._('Search external services for matching records.')}
        </span>
        <md-list>
          ${searchWebUrls.map(
            web => html` <div>
              <md-list-item
                type="button"
                href="${`${web.baseUrl}${web.params}`}"
                target="_blank"
              >
                <span class="icon">
                  ${renderIcon(
                    mdiOpenInNew,
                    'var(--grampsjs-body-font-color-100)'
                  )}
                </span>
                <span> ${web.value} </span>
                <span class="meta-icon">
                  ${renderIcon(
                    this.getWebCriteriaIcon(web.websiteCriteria),
                    'var(--grampsjs-body-font-color-60)'
                  )}
                </span>
              </md-list-item>
            </div>`
          )}
        </md-list>
        <div class="legend">
          <span class="legend-item">
            ${renderIcon(mdiEarth, 'var(--grampsjs-body-font-color-60)')}
            <span>${this._('Open access')}</span>
          </span>
          <span class="legend-item">
            ${renderIcon(
              mdiShieldAccount,
              'var(--grampsjs-body-font-color-60)'
            )}
            <span>${this._('Registration required')}</span>
          </span>
          <span class="legend-item">
            ${renderIcon(mdiLock, 'var(--grampsjs-body-font-color-60)')}
            <span>${this._('Records require additional access')}</span>
          </span>
        </div>
      </div>
    `
  }
}

window.customElements.define(
  'grampsjs-form-external-search',
  GrampsjsFormExternalSearch
)
