import {html, css, LitElement} from 'lit'
import '@material/web/dialog/dialog'
import '@material/web/button/text-button'
import '@material/web/chips/chip-set'
import '@material/web/chips/filter-chip'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

const namespaces = {
  people: 'People',
  families: 'Families',
  events: 'Events',
  places: 'Places',
  sources: 'Sources',
  citations: 'Citations',
  repositories: 'Repositories',
  notes: 'Notes',
  media: 'Media Objects',
  tags: 'Tags',
}

class GrampsjsDeleteAll extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-filter-chip {
          --md-sys-color-secondary-container: rgba(109, 76, 65, 0.32);
          --md-sys-color-on-secondary-container: var(
            --grampsjs-body-font-color-78
          );
        }
      `,
    ]
  }

  static get properties() {
    return {
      _namespaces: {type: String},
    }
  }

  constructor() {
    super()
    this._namespaces = ''
  }

  show() {
    this.renderRoot.querySelector('md-dialog').show()
  }

  render() {
    return html`
      <md-dialog
        id="filter-dialog"
        ?open="${this.open}"
        @close=${this._handleClose}
      >
        <div slot="headline">${this._('Delete all objects')}</div>

        <form slot="content" id="form-id" method="dialog">
          <md-chip-set>
            ${Object.keys(namespaces).map(
              namespace => html`
                <md-filter-chip
                  @click="${this._handleChipsChanged}"
                  label="${this._(namespaces[namespace])}"
                  id="${namespace}"
                  selected
                ></md-filter-chip>
              `
            )}
          </md-chip-set>
        </form>
        <div slot="actions">
          <md-text-button form="form-id" value="cancel"
            >${this._('Cancel')}</md-text-button
          >
          <md-text-button
            form="form-id"
            value="ok"
            ?disabled="${this._namespaces === 'none'}"
            >${this._('Delete')}</md-text-button
          >
        </div>
      </md-dialog>
    `
  }

  _handleChipsChanged() {
    const selectedChips = [
      ...this.renderRoot.querySelectorAll('md-filter-chip'),
    ].filter(chip => chip.selected)
    if (selectedChips.length === 0) {
      this._namespaces = 'none'
    } else {
      this._namespaces = selectedChips.map(chip => chip.id).join(',')
    }
  }

  _handleClose() {
    const {returnValue} = this.renderRoot.querySelector('md-dialog')
    if (returnValue === 'ok') {
      fireEvent(this, 'delete-objects', {namespaces: this._namespaces})
    }
  }
}

window.customElements.define('grampsjs-delete-all', GrampsjsDeleteAll)
