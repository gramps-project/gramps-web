import {html, css, LitElement} from 'lit'
import {mdiEarth, mdiOpenInNew} from '@mdi/js'

import '@material/web/button/text-button.js'

import './GrampsjsIcon.js'
import {BUILDING_COLOR} from './GrampsjsMapWikidataLayer.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {
  formatWikidataTime,
  formatWikidataTimeRange,
  getCommonsThumbnailUrl,
  getDomusUrl,
  getWikidataUrl,
  queryWikidataBuilding,
} from '../wikidata.ts'

export class GrampsjsWikidataBuildingBox extends GrampsjsAppStateMixin(
  LitElement
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        h2,
        h3,
        h4 {
          font-family: var(--grampsjs-body-font-family);
        }

        h2 {
          font-weight: 500;
          font-size: 22px;
          margin-top: 10px;
          margin-bottom: 0;
        }

        h3 {
          font-weight: 400;
          font-size: 18px;
          margin-top: 24px;
          margin-bottom: 7px;
        }

        h4 {
          margin-top: 2px;
          margin-bottom: 0;
          font-weight: 300;
          font-size: 15px;
        }

        :host {
          font-size: 16px;
        }

        img {
          display: block;
          width: 100%;
          max-height: 220px;
          object-fit: cover;
          border-radius: 12px;
          margin-top: 12px;
        }

        p {
          margin-top: 0.6em;
          margin-bottom: 0.6em;
        }

        ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        /* Row sizes match the events table in the place panel. */
        li {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 3px 0;
          font-size: 15px;
        }

        ul.dates {
          margin-top: 12px;
        }

        p.source {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
          margin-top: 4px;
        }

        .range {
          white-space: nowrap;
          color: var(--md-sys-color-on-surface-variant);
          font-size: 14px;
        }

        .right {
          text-align: right;
          position: sticky;
          bottom: 0;
          background: var(--md-sys-color-surface-container-high);
          margin-top: 4px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      qid: {type: String},
      label: {type: String},
      _detail: {type: Object},
      _loading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.qid = ''
    this.label = ''
    this._detail = null
    this._loading = false
  }

  updated(changed) {
    const prevLang = changed.get('appState')?.i18n?.lang
    const langChanged =
      changed.has('appState') &&
      prevLang !== undefined &&
      prevLang !== this.appState?.i18n?.lang
    if (changed.has('qid') || langChanged) {
      this._fetchDetail()
    }
  }

  disconnectedCallback() {
    this._abort?.abort()
    super.disconnectedCallback()
  }

  async _fetchDetail() {
    this._abort?.abort()
    this._detail = null
    this._loading = Boolean(this.qid)
    if (!this.qid) return
    const abort = new AbortController()
    this._abort = abort
    try {
      const res = await queryWikidataBuilding(this.qid, {
        lang: this.appState?.i18n?.lang,
        signal: abort.signal,
      })
      // A response can complete just before a newer request aborts it.
      if (abort !== this._abort) return
      this._detail = res.data ?? null
      this._loading = false
    } catch (e) {
      // Aborted by a newer request.
    }
  }

  get _lang() {
    return this.appState?.i18n?.lang || 'en'
  }

  render() {
    if (!this.qid) return ''
    return html`
      <h2>${this._detail?.label || this.label}</h2>
      ${this._renderSubtitle()}
      <p class="source">
        <grampsjs-icon
          path="${mdiEarth}"
          height="16"
          width="16"
          color="var(--grampsjs-map-building-color, ${BUILDING_COLOR})"
        ></grampsjs-icon>
        ${this._('Public data from %s', 'Wikidata')}
      </p>
      ${this._loading ? this._renderLoading() : this._renderDetail()}
      <div class="right">
        ${this._renderExternalButton('Wikidata', getWikidataUrl(this.qid))}
        ${this._renderExternalButton('Domus', getDomusUrl(this.qid))}
      </div>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderExternalButton(label, url) {
    return html`
      <md-text-button href="${url}" target="_blank">
        ${label}
        <grampsjs-icon
          .path="${mdiOpenInNew}"
          slot="icon"
          color="var(--mdc-theme-primary)"
        ></grampsjs-icon>
      </md-text-button>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderLoading() {
    return html`
      <span class="skeleton skeleton-text" style="width:60%">&nbsp;</span>
      <span class="skeleton skeleton-text" style="width:80%">&nbsp;</span>
    `
  }

  _renderSubtitle() {
    const detail = this._detail
    if (!detail) return ''
    const subtitle = detail.types.length
      ? detail.types.join(', ')
      : detail.description
    return subtitle ? html`<h4>${subtitle}</h4>` : ''
  }

  _renderDetail() {
    const detail = this._detail
    if (!detail) return ''
    return html`
      ${detail.image
        ? html`<a href="${detail.image}" target="_blank"
            ><img
              src="${getCommonsThumbnailUrl(detail.image)}"
              alt="${detail.label}"
              loading="lazy"
          /></a>`
        : ''}
      ${this._renderDates(detail)}
      ${this._renderList(this._('Addresses'), detail.addresses)}
      ${this._renderList(this._('Occupants'), detail.occupants)}
      ${this._renderList(this._('Owners'), detail.owners)}
      ${this._renderGenealogyLinks(detail)}
    `
  }

  _renderDates(detail) {
    const rows = [
      [this._('Built'), formatWikidataTime(detail.inception, this._lang)],
      [this._('Demolished'), formatWikidataTime(detail.demolished, this._lang)],
    ].filter(([, value]) => value)
    if (!rows.length) return ''
    return html`
      <ul class="dates">
        ${rows.map(
          ([label, value]) =>
            html`<li>
              <span>${label}</span><span class="range">${value}</span>
            </li>`
        )}
      </ul>
    `
  }

  _renderList(title, entries) {
    if (!entries.length) return ''
    return html`
      <h3>${title}</h3>
      <ul>
        ${entries.map(
          entry => html`<li>
            <span>${entry.label}</span>
            <span class="range"
              >${formatWikidataTimeRange(
                entry.start,
                entry.end,
                this._lang
              )}</span
            >
          </li>`
        )}
      </ul>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderGenealogyLinks(detail) {
    const links = [
      detail.govId && {
        label: 'GOV',
        url: `https://gov.genealogy.net/item/show/${detail.govId}`,
      },
      detail.genWikiId && {
        label: 'GenWiki',
        url: `https://wiki.genealogy.net/?curid=${detail.genWikiId}`,
      },
    ].filter(Boolean)
    if (!links.length) return ''
    return html`<p>
      ${links.map(
        (link, i) =>
          html`${i ? ' · ' : ''}<a href="${link.url}" target="_blank"
              >${link.label}</a
            >`
      )}
    </p>`
  }
}

window.customElements.define(
  'grampsjs-wikidata-building-box',
  GrampsjsWikidataBuildingBox
)
