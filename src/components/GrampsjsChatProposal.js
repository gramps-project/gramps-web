/*
Changes the AI assistant proposes, for the user to review and apply.

Shows every record the proposal adds, changes or deletes, with a row per
changed field, and fires `chat-proposal:apply` when the user applies them.
*/

import {html, css, LitElement} from 'lit'
import '@material/web/button/filled-button.js'
import {mdiArrowRight, mdiCheck} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {
  describeValue,
  formatDate,
  handlesToFetch,
  proposalChanges,
} from '../chatProposal.js'
import {
  fireEvent,
  objectDescription,
  objectIconPath,
  objectTypeSingular,
  objectTypeToEndpoint,
} from '../util.js'
import './GrampsjsIcon.js'

const CHANGE_LABELS = {add: 'New', update: 'Edit', delete: 'Delete'}

class GrampsjsChatProposal extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          margin: 16px 0 0 35px;
        }

        .proposal {
          border: 1px solid var(--grampsjs-body-font-color-20);
          border-radius: 12px;
          padding: 16px 20px 20px 20px;
        }

        h3 {
          margin: 0 0 20px 0;
          font-size: 16px;
          font-weight: 500;
        }

        .record + .record {
          margin-top: 24px;
        }

        .record-header {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px 10px;
        }

        .record-title {
          font-weight: 500;
        }

        .record-title.deleted {
          text-decoration: line-through;
        }

        .gramps-id {
          color: var(--grampsjs-text-secondary-color);
        }

        .change-type {
          font-size: 14px;
          line-height: 22px;
          padding: 0 10px;
          border-radius: 11px;
          background-color: var(--grampsjs-color-shade-230);
        }

        .change-type.add {
          background-color: var(
            --grampsjs-color-revision-added-background-green
          );
        }

        .change-type.delete {
          background-color: var(
            --grampsjs-color-revision-deleted-background-red
          );
        }

        .rows {
          display: grid;
          grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
          gap: 6px 20px;
          margin: 10px 0 0 34px;
        }

        .field {
          color: var(--grampsjs-text-secondary-color);
        }

        .values {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .before,
        .after {
          border-radius: 4px;
          padding: 1px 4px;
        }

        .before {
          background-color: var(
            --grampsjs-color-revision-deleted-background-red
          );
          text-decoration: line-through;
          text-decoration-color: var(--grampsjs-body-font-color-50);
        }

        .after {
          background-color: var(
            --grampsjs-color-revision-added-background-green
          );
        }

        .arrow {
          position: relative;
          top: 3px;
          margin: 0 6px;
        }

        .footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 24px;
        }

        .status {
          color: var(--grampsjs-text-secondary-color);
        }

        @media (max-width: 600px) {
          .rows {
            grid-template-columns: minmax(0, 1fr);
            row-gap: 0;
            margin-left: 0;
          }

          .values {
            margin-bottom: 8px;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      proposal: {type: Object},
      status: {type: String},
      disabled: {type: Boolean},
      _objects: {type: Object},
    }
  }

  constructor() {
    super()
    this.proposal = null
    this.status = ''
    this.disabled = false
    // records the proposal refers to, fetched by handle
    this._objects = {}
    this._requested = new Set()
    this._changesOf = null
    this._changes = []
    this._local = new Map()
    this._deleted = new Set()
  }

  // The changes of the current proposal, and the states of its records by
  // handle, computed once per proposal
  _updateChanges() {
    if (this._changesOf === this.proposal) return
    this._changesOf = this.proposal
    this._changes = proposalChanges(this.proposal?.transaction)
    this._local = new Map(
      (this.proposal?.transaction ?? []).map(item => [
        item.handle,
        item.new ?? item.old,
      ])
    )
    this._deleted = new Set(
      this._changes
        .filter(change => change.type === 'delete')
        .map(change => change.handle)
    )
  }

  render() {
    this._updateChanges()
    if (this._changes.length === 0) return ''
    return html`
      <div class="proposal">
        <h3>${this._('Proposed changes')}</h3>
        ${this._changes.map(change => this._renderChange(change))}
        ${this._renderFooter()}
      </div>
    `
  }

  _renderChange(change) {
    return html`
      <div class="record">
        <div class="record-header">
          <grampsjs-icon
            path="${objectIconPath[change.objClass]}"
            color="var(--grampsjs-body-font-color-50)"
          ></grampsjs-icon>
          <span
            class="record-title ${change.type === 'delete' ? 'deleted' : ''}"
            >${this._recordLabel(change.objClass, change.handle)}</span
          >
          ${change.grampsId
            ? html`<span class="gramps-id">${change.grampsId}</span>`
            : ''}
          <span class="change-type ${change.type}"
            >${this._(CHANGE_LABELS[change.type])}</span
          >
        </div>
        ${change.rows.length > 0
          ? html`
              <div class="rows">
                ${change.rows.map(
                  row => html`
                    <div class="field">${this._renderPath(row.path)}</div>
                    <div class="values">${this._renderValues(row)}</div>
                  `
                )}
              </div>
            `
          : ''}
      </div>
    `
  }

  _renderPath(path) {
    return path
      .map(segment =>
        typeof segment === 'string'
          ? this._(segment)
          : this._recordLabel(segment.objClass, segment.handle)
      )
      .flatMap((segment, i) => (i === 0 ? [segment] : [' › ', segment]))
  }

  _renderValues(row) {
    return html`${row.before
      ? html`<span class="before">${this._renderValue(row.before)}</span>`
      : ''}${row.before && row.after
      ? html`<grampsjs-icon
          class="arrow"
          path="${mdiArrowRight}"
          height="16"
          width="16"
          color="var(--grampsjs-body-font-color-50)"
        ></grampsjs-icon>`
      : ''}${row.after
      ? html`<span class="after">${this._renderValue(row.after)}</span>`
      : ''}`
  }

  _renderValue(value) {
    switch (value.kind) {
      case 'label':
        return value.context
          ? this._p(value.context, value.text)
          : this._(value.text)
      case 'date':
        return formatDate(
          value.date,
          s => this._(s),
          (context, s) => this._p(context, s)
        )
      case 'ref':
        return this._renderRef(value)
      default:
        return value.text
    }
  }

  // A referenced record, linked while it exists in the database
  _renderRef(ref) {
    const label = this._recordLabel(ref.objClass, ref.handle)
    const grampsId = this._objects[ref.handle]?.gramps_id
    const deleted = this.status === 'applied' && this._deleted.has(ref.handle)
    if (!grampsId || ref.objClass === 'tag' || deleted) return label
    return html`<a href="/${ref.objClass}/${grampsId}">${label}</a>`
  }

  // A short description of a record: from the database if it exists there,
  // otherwise from its state in the proposal
  _recordLabel(objClass, handle) {
    const {strings} = this.appState.i18n
    const fetched = this._objects[handle]
    if (fetched) return objectDescription(objClass, fetched, strings)
    const local = this._local.get(handle)
    if (!local) return this._(objectTypeSingular[objClass] ?? objClass)
    switch (objClass) {
      case 'family': {
        const parents = [local.father_handle, local.mother_handle]
          .filter(Boolean)
          .map(parent => this._recordLabel('person', parent))
        return parents.length > 0
          ? parents.flatMap((parent, i) =>
              i === 0 ? [parent] : [' & ', parent]
            )
          : this._('Family')
      }
      case 'event': {
        const type = describeValue('type', local.type)
        const date = formatDate(
          local.date,
          s => this._(s),
          (context, s) => this._p(context, s)
        )
        const typeLabel = type ? this._renderValue(type) : this._('Event')
        return date ? html`${typeLabel} (${date})` : typeLabel
      }
      case 'citation':
        return (
          local.page ||
          (local.source_handle
            ? this._recordLabel('source', local.source_handle)
            : this._('Citation'))
        )
      default:
        return objectDescription(objClass, local, strings)
    }
  }

  _renderFooter() {
    if (this.status === 'applied') {
      return html`
        <div class="footer status">
          <grampsjs-icon
            path="${mdiCheck}"
            color="var(--grampsjs-text-secondary-color)"
          ></grampsjs-icon>
          ${this._('Changes applied')}
        </div>
      `
    }
    if (this.status === 'outdated') {
      return html`
        <div class="footer status">
          ${this._('These changes can no longer be applied.')}
        </div>
      `
    }
    if (!this.appState.permissions?.canEdit) return ''
    return html`
      <div class="footer">
        <md-filled-button
          ?disabled="${this.disabled}"
          @click="${this._handleApply}"
          >${this._('Apply')}</md-filled-button
        >
      </div>
    `
  }

  _handleApply() {
    fireEvent(this, 'chat-proposal:apply')
  }

  updated(changed) {
    if (changed.has('proposal')) {
      this._updateChanges()
      this._fetchRecords(this._changes)
    }
  }

  // Fetches the records the changes refer to that are not fetched yet, to
  // describe them as they are in the database
  async _fetchRecords(changes) {
    const {lang} = this.appState.i18n
    const toFetch = handlesToFetch(changes)
    await Promise.all(
      Object.entries(toFetch).map(async ([objClass, handles]) => {
        const endpoint = objectTypeToEndpoint[objClass]
        const missing = handles.filter(handle => !this._requested.has(handle))
        if (!endpoint || missing.length === 0) return
        missing.forEach(handle => this._requested.add(handle))
        const profile = objClass === 'tag' ? '' : `&profile=self&locale=${lang}`
        const result = await this.appState.apiGet(
          `/api/${endpoint}/?handles=${missing.join(',')}${profile}`
        )
        if (!Array.isArray(result?.data)) {
          // a failed request can be retried with the next proposal
          missing.forEach(handle => this._requested.delete(handle))
          return
        }
        this._objects = {
          ...this._objects,
          ...Object.fromEntries(result.data.map(obj => [obj.handle, obj])),
        }
      })
    )
  }
}

window.customElements.define('grampsjs-chat-proposal', GrampsjsChatProposal)
