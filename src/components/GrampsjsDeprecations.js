/*
Server configuration options that are deprecated but still in use.
*/

import {css, html, LitElement} from 'lit'
import {mdiAlertOutline, mdiArrowRight} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsIcon.js'

// Deprecation messages mark up option names with Markdown-style backticks.
// Odd-indexed segments are the ones that were enclosed in a pair.
function renderInlineCode(text) {
  return text
    .split('`')
    .map((part, i) => (i % 2 ? html`<code>${part}</code>` : part))
}

export class GrampsjsDeprecations extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
        }

        .deprecations {
          font-size: 16px;
          padding: 0 1.4em;
          border: 1px solid var(--md-sys-color-tertiary);
          border-radius: 8px;
        }

        .deprecation-row {
          padding: 0.8em 0;
        }

        .deprecation-row + .deprecation-row {
          border-top: 1px solid var(--md-sys-color-tertiary);
        }

        .deprecation-row p {
          margin: 0.4em 0;
        }

        .deprecation-heading {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5em;
          font-weight: 500;
        }

        /* Lighter than the bordered .monospace chips in the heading, so that
           option names quoted mid-sentence do not break up the prose. */
        .deprecation-row code {
          font-family: var(--grampsjs-mono-font-family);
          font-size: 0.9em;
          color: var(--grampsjs-color-monospace);
          background-color: var(--grampsjs-body-font-color-5);
          border-radius: 4px;
          padding: 0.1em 0.3em;
        }
      `,
    ]
  }

  render() {
    // The API only sends this key to server administrators, so its presence
    // is the permission check.
    const deprecations = this.appState.dbInfo?.deprecations ?? []
    if (deprecations.length === 0) {
      return ''
    }
    return html`
      <h3>${this._('Warnings')}</h3>
      <p>
        ${this._(
          'The server uses configuration options that are no longer supported.'
        )}
      </p>
      <div class="deprecations">
        ${deprecations.map(
          deprecation => html`
            <div class="deprecation-row">
              <p class="deprecation-heading">
                <grampsjs-icon
                  path="${mdiAlertOutline}"
                  color="var(--md-sys-color-tertiary)"
                  height="18"
                  width="18"
                ></grampsjs-icon>
                <span class="monospace">${deprecation.option}</span>
                ${deprecation.replacement
                  ? html`
                      <grampsjs-icon
                        path="${mdiArrowRight}"
                        color="currentColor"
                        height="18"
                        width="18"
                      ></grampsjs-icon>
                      <span class="monospace">${deprecation.replacement}</span>
                    `
                  : ''}
              </p>
              ${deprecation.message
                ? html`<p>${renderInlineCode(deprecation.message)}</p>`
                : ''}
              ${deprecation.removed_in
                ? html`<p>
                    ${this._(
                      'Support will be removed in Gramps Web API %s.',
                      deprecation.removed_in
                    )}
                  </p>`
                : ''}
            </div>
          `
        )}
      </div>
    `
  }
}

window.customElements.define('grampsjs-deprecations', GrampsjsDeprecations)
