import tippy from 'tippy.js'

import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import {schemeSet1} from 'd3-scale-chromatic'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {ChromosomeBrowser} from '../charts/ChromosomeBrowser.js'
import {clickKeyHandler} from '../util.js'

class GrampsjsChromosomeBrowser extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        svg a {
          text-decoration: none !important;
        }

        div#container {
          display: inline-block;
          max-width: 800px;
          vertical-align: top;
          margin-bottom: 20px;
        }

        div#legend {
          display: inline-block;
          vertical-align: top;
          padding: 0;
          font-size: 15px;
          font-weight: 330;
          margin-left: 20px;
        }

        #legend ul {
          list-style-type: none;
          padding: 0;
          margin: 0;
        }

        #legend ul li {
          padding: 4px;
          margin: 0;
          cursor: pointer;
        }

        #legend ul li.muted {
          opacity: 0.3;
        }

        span.dot {
          display: inline-block;
          width: 11px;
          height: 11px;
          border-radius: 3px;
          margin-right: 8px;
          opacity: 0.9;
        }

        @keyframes pulse {
          0% {
            opacity: 0.1;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.1;
          }
        }

        div.loading svg {
          animation: pulse 1.5s linear infinite;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      width: {type: String},
      selected: {type: Number},
      person: {type: Object},
      loading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = []
    this.width = 600
    this.selected = -1
    this.person = {}
    this.loading = false
  }

  render() {
    return html`${this.renderChart()} `
  }

  renderChart() {
    let {data} = this
    if (this.selected >= 0) {
      data = data.map((obj, index) =>
        index === this.selected ? obj : {segments: [], handle: obj.handle}
      )
    }
    return html`
      <div id="container" class="${classMap({loading: this.loading})}">
        ${ChromosomeBrowser(data, {width: this.width})}
      </div>
      <div id="legend">${this.renderLegend()}</div>
    `
  }

  _getNameFromHandle(handle) {
    const people = this.person?.extended?.people || []
    let person = people.filter(p => p.handle === handle)
    if (person.length === 0) {
      return ''
    }
    // eslint-disable-next-line prefer-destructuring
    person = person[0]
    return `${person?.primary_name?.first_name || '...'}
    ${person?.primary_name?.surname_list?.[0]?.surname || '...'}`
  }

  renderLegend() {
    return html`<ul>
      ${this.data.map(
        (obj, i) => html`
          <li
            @click="${e => this._handleLegendClick(e, i)}"
            @keydown="${clickKeyHandler}"
            class="${classMap({
              muted: this.selected > -1 && this.selected !== i,
            })}"
            id="legend-item-${i}"
          >
            <span class="dot" style="background-color:${schemeSet1[i]};"></span
            >${this._getNameFromHandle(obj.handle)}
          </li>
        `
      )}
    </ul> `
  }

  updated(changed) {
    if (
      changed.has('data') ||
      changed.has('selected') ||
      changed.has('width')
    ) {
      this._updateTooltips()
    }
  }

  _updateTooltips() {
    this.data.map(obj =>
      obj.segments.map(seg => {
        const id = `rect-segment-${obj.handle}-${seg.start}-${seg.stop}`
        const el = this.renderRoot.getElementById(id)
        if (el) {
          tippy(el, {
            content: `
            ${this._getNameFromHandle(obj.handle)}<br/>
            ${
              seg.cM
                ? `<b>${new Intl.NumberFormat().format(seg.cM)} cM</b>`
                : ''
            }${seg.cM && seg.SNPs ? ',' : ''}
            ${seg.SNPs ? `${seg.SNPs} SNPs` : ''}
            ${seg.cM || seg.SNPs ? '<br/>' : ''}
            ${new Intl.NumberFormat().format(
              seg.start
            )}&ndash;${new Intl.NumberFormat().format(seg.stop)}<br/>
            ${
              obj.ancestor_profiles?.length
                ? `${this._('Common ancestors')}: ${obj.ancestor_profiles
                    .map(
                      profile => `${profile.name_given} ${profile.name_surname}`
                    )
                    .join(', ')}<br/>`
                : ''
            }
            ${obj.relation ? `${this._('Relationship')}: ${obj.relation}` : ''}
            `,
            allowHTML: true,
          })
        }
        return null
      })
    )
  }

  _handleLegendClick(event, i) {
    this.selected = this.selected === i ? -1 : i
    event.preventDefault()
    event.stopPropagation()
  }

  firstUpdated() {
    const container = this.renderRoot.getElementById('container')
    this.handleResize()
    new ResizeObserver(() => this.handleResize()).observe(container)
  }

  handleResize() {
    const container = this.renderRoot.getElementById('container')
    this.width = container.offsetWidth
  }
}

window.customElements.define(
  'grampsjs-chromosome-browser',
  GrampsjsChromosomeBrowser
)
