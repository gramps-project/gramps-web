import {html, css} from 'lit'

import {GrampsjsViewObjectsDetail} from './GrampsjsViewObjectsDetail.js'
import '../components/GrampsjsSourceCitations.js'
import {renderIcon} from '../objectRender.js'

export class GrampsjsViewSourceCitations extends GrampsjsViewObjectsDetail {
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

  getUrl() {
    return `/api/citations/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&extend=all&handles=${this.handles.join(',')}`
  }

  renderLoading() {
    return html`
      <md-list>
        ${this.handles.map(
          () => html`
            <md-list-item type="text">
              <span class="skeleton" style="width:12em;">&nbsp;</span>
              <span slot="supporting-text" class="skeleton" style="width:6em;"
                >&nbsp;</span
              >
              ${renderIcon({object_type: 'citation'}, 'start')}
            </md-list-item>
          `
        )}
      </md-list>
    `
  }

  renderElements() {
    return html`
      <grampsjs-source-citations
        hasShare
        .data="${this._data}"
        ?edit="${this.edit}"
        .appState="${this.appState}"
      >
      </grampsjs-source-citations>
    `
  }

  renderEdit() {
    if (this._data.length === 0) {
      return this.renderElements()
    }
    return ''
  }
}

window.customElements.define(
  'grampsjs-view-source-citations',
  GrampsjsViewSourceCitations
)
