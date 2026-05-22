import {html, css, LitElement} from 'lit'
import {unsafeHTML} from 'lit/directives/unsafe-html.js'
import {classMap} from 'lit/directives/class-map.js'
import '@material/web/icon/icon.js'
import {mdiFamilyTree} from '@mdi/js'
import {marked} from 'marked'
import DOMPurify from 'dompurify'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {renderIconSvg} from '../icons.js'

marked.use({breaks: true})

const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    'b',
    'i',
    'ul',
    'ol',
    'li',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'code',
    'pre',
    'a',
  ],
  ALLOWED_ATTR: ['href'],
}

const MARKDOWN_CACHE_MAX = 30
const markdownCache = new Map()

const renderMarkdown = markdown => {
  if (!markdownCache.has(markdown)) {
    if (markdownCache.size >= MARKDOWN_CACHE_MAX) {
      markdownCache.delete(markdownCache.keys().next().value)
    }
    markdownCache.set(
      markdown,
      DOMPurify.sanitize(marked.parse(markdown), DOMPURIFY_CONFIG)
    )
  }
  return html`${unsafeHTML(markdownCache.get(markdown))}`
}

class GrampsjsChatMessage extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .container {
          margin: 15px 0;
          font-size: 16px;
          line-height: 26px;
          font-weight: 340;
          clear: right;
          max-width: 90%;
          display: flex;
          align-items: flex-start;
        }

        .container.human {
          background-color: var(--grampsjs-color-shade-230);
          color: var(--grampsjs-body-font-color);
          padding: 10px 20px;
          border-radius: 16px;
          float: right;
          max-width: 70%;
          margin-right: 10px;
        }

        .container.alert {
          max-width: 70%;
          margin-left: auto;
          margin-right: auto;
          width: fit-content;
          border-radius: 16px;
          border: 0;
        }

        .slot-wrap {
          flex-grow: 1;
          overflow: hidden;
          white-space: pre-wrap;
        }

        .slot-wrap.markdown {
          white-space: normal;
        }

        .slot-wrap p {
          margin: 0;
        }

        .slot-wrap p + p {
          margin-top: 0.6em;
        }

        .slot-wrap ul,
        .slot-wrap ol {
          margin: 0.4em 0;
          padding-left: 1.5em;
        }

        .slot-wrap h1,
        .slot-wrap h2,
        .slot-wrap h3 {
          margin: 0.6em 0 0.2em;
          font-size: 1em;
          font-weight: 600;
        }

        .slot-wrap code {
          font-family: monospace;
          background: var(--grampsjs-color-shade-230);
          padding: 0.1em 0.3em;
          border-radius: 3px;
          font-size: 0.9em;
        }

        .slot-wrap pre {
          background: var(--grampsjs-color-shade-230);
          padding: 0.6em 0.8em;
          border-radius: 6px;
          overflow-x: auto;
          margin: 0.4em 0;
        }

        .slot-wrap pre code {
          background: none;
          padding: 0;
        }

        .avatar {
          width: 35px;
          height: 35px;
          flex-shrink: 0;
        }

        .avatar md-icon {
          --md-icon-size: 20px;
          position: relative;
          top: 3px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      type: {type: String},
      message: {type: String},
    }
  }

  constructor() {
    super()
    this.type = 'human'
    this.message = ''
  }

  render() {
    return html`
      <div
        class="${classMap({
          container: true,
          human: this.type === 'human',
          ai: this.type === 'ai',
          alert: this.type === 'error',
          error: this.type === 'error',
        })}"
      >
        ${this.type === 'ai'
          ? html`
              <div class="avatar">
                <md-icon
                  >${renderIconSvg(
                    mdiFamilyTree,
                    'var(--grampsjs-body-font-color-40)',
                    270
                  )}</md-icon
                >
              </div>
            `
          : ''}
        <slot name="no-wrap"></slot>
        <!-- prettier-ignore -->
        <div class="${this.type === 'ai'
          ? 'slot-wrap markdown'
          : 'slot-wrap'}">${this.type === 'ai'
          ? renderMarkdown(this.message)
          : this.message}</div>
      </div>
    `
  }
}

window.customElements.define('grampsjs-chat-message', GrampsjsChatMessage)
