/*
The list of main navigation destinations shown in the navigation drawer
*/

import {html, css, LitElement} from 'lit'
import '@material/web/ripple/ripple.js'
import '@material/web/focus/md-focus-ring.js'

import {
  mdiFamilyTree,
  mdiCreation,
  mdiCreationOutline,
  mdiDna,
  mdiHome,
  mdiHomeOutline,
  mdiImage,
  mdiImageOutline,
  mdiRss,
  mdiFormatListBulleted,
  mdiMap,
  mdiMapOutline,
  mdiHistory,
  mdiBookmark,
  mdiBookmarkOutline,
  mdiFormatListChecks,
  mdiDownload,
  mdiDownloadOutline,
  mdiFileExport,
  mdiFileExportOutline,
  mdiSourceCommit,
  mdiCalendarMonth,
  mdiTimeline,
  mdiTimelineOutline,
} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {LISTS_PAGES} from '../routing.js'
import './GrampsjsIcon.js'
import './GrampsjsTooltip.js'

// The destinations in groups. Each has the pages it is selected on: the page
// it leads to and the pages below it, such as a task under the tasks. Object
// pages are reached from many places, so they select no destination. The
// icon is an outline one, and the filled one when selected.
const GROUPS = [
  [
    {id: 'home', href: '/', pages: ['home'], label: 'Home'},
    {id: 'blog', href: '/blog', pages: ['blog'], label: 'Blog'},
    {id: 'tree', href: '/tree', pages: ['tree'], label: 'Family Tree'},
    {
      id: 'timeline',
      href: '/timeline',
      pages: ['timeline'],
      label: 'Timeline',
    },
    {
      id: 'anniversaries',
      href: '/anniversaries',
      pages: ['anniversaries'],
      label: 'Anniversaries',
    },
    {id: 'map', href: '/map', pages: ['map'], label: 'Map'},
    {
      id: 'dna',
      href: '/dna-matches',
      pages: ['dna-matches', 'dna-chromosome', 'ydna'],
      label: 'DNA',
    },
    {id: 'lists', href: '/people', pages: LISTS_PAGES, label: 'Lists'},
    {id: 'media', href: '/medialist', pages: ['medialist'], label: 'Media'},
    {id: 'chat', href: '/chat', pages: ['chat'], label: 'Assistant'},
  ],
  [
    {id: 'recent', href: '/recent', pages: ['recent'], label: 'History'},
    {
      id: 'bookmarks',
      href: '/bookmarks',
      pages: ['bookmarks'],
      label: '_Bookmarks',
    },
    {id: 'tasks', href: '/tasks', pages: ['tasks', 'task'], label: 'Tasks'},
    {
      id: 'reports',
      href: '/reports',
      pages: ['reports', 'report'],
      label: '_Reports',
    },
    {id: 'export', href: '/export', pages: ['export'], label: 'Export'},
    {
      id: 'revisions',
      href: '/revisions',
      pages: ['revisions', 'revision'],
      label: 'Revisions',
    },
  ],
]

// [outline, filled] icons; a single one where MDI has no outline variant
const ICONS = {
  home: [mdiHomeOutline, mdiHome],
  blog: [mdiRss],
  tree: [mdiFamilyTree],
  timeline: [mdiTimelineOutline, mdiTimeline],
  anniversaries: [mdiCalendarMonth],
  map: [mdiMapOutline, mdiMap],
  dna: [mdiDna],
  lists: [mdiFormatListBulleted],
  media: [mdiImageOutline, mdiImage],
  chat: [mdiCreationOutline, mdiCreation],
  recent: [mdiHistory],
  bookmarks: [mdiBookmarkOutline, mdiBookmark],
  tasks: [mdiFormatListChecks],
  reports: [mdiFileExportOutline, mdiFileExport],
  export: [mdiDownloadOutline, mdiDownload],
  revisions: [mdiSourceCommit],
}

class GrampsjsMainMenu extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
        }

        nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px 12px 12px 12px;
        }

        .group + .group {
          margin-top: 28px;
        }

        .group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        a,
        a:link,
        a:visited,
        a:hover {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          height: 40px;
          padding: 0 12px;
          border-radius: 8px;
          color: var(--md-sys-color-on-surface);
          text-decoration: none;
          font-size: 14px;
          font-weight: var(--grampsjs-font-weight-medium);
          outline: none;
          white-space: nowrap;
          overflow: hidden;
          --md-ripple-hover-color: var(--md-sys-color-on-surface);
          --md-ripple-pressed-color: var(--md-sys-color-on-surface);
          --md-focus-ring-shape: 8px;
        }

        a grampsjs-icon {
          flex: 0 0 auto;
          color: var(--md-sys-color-on-surface-variant);
        }

        a[aria-current='page'] {
          background-color: var(--grampsjs-drawer-selected-color);
          color: var(--grampsjs-drawer-selected-font-color);
          font-weight: var(--grampsjs-font-weight-heading);
        }

        a[aria-current='page'] grampsjs-icon {
          color: var(--md-sys-color-primary);
        }

        .label {
          overflow: hidden;
          text-overflow: ellipsis;
          transition: opacity 150ms linear;
        }

        /* the rail is the same menu, as wide as an item's icon and padding,
           so the drawer can animate between the two by its width alone */
        :host([rail]) .label {
          opacity: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .label {
            transition: none;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      rail: {type: Boolean, reflect: true},
    }
  }

  constructor() {
    super()
    this.rail = false
  }

  _isShown(id) {
    if (id === 'dna') return !this.appState.frontendConfig.hideDNALink
    if (id === 'chat') return this.canUseChat
    if (id === 'revisions') return this.appState.permissions.canViewPrivate
    return true
  }

  _item({id, href, pages, label}) {
    const selected = pages.includes(this.appState.path.page)
    const [outline, filled = outline] = ICONS[id]
    const text = this._(label)
    return html`
      <a
        id="nav-${id}"
        href="${href}"
        aria-current="${selected ? 'page' : 'false'}"
        aria-label="${text}"
      >
        <md-focus-ring inward></md-focus-ring>
        <md-ripple></md-ripple>
        <grampsjs-icon
          path="${selected ? filled : outline}"
          color="currentColor"
        ></grampsjs-icon>
        <span class="label">${text}</span>
      </a>
      ${this.rail
        ? html`<grampsjs-tooltip
            for="nav-${id}"
            placement="right"
            .appState="${this.appState}"
            >${text}</grampsjs-tooltip
          >`
        : ''}
    `
  }

  render() {
    return html`
      <nav aria-label="${this._('Menu')}">
        ${GROUPS.map(group => group.filter(item => this._isShown(item.id)))
          .filter(group => group.length > 0)
          .map(
            group =>
              html`<div class="group">
                ${group.map(item => this._item(item))}
              </div>`
          )}
      </nav>
    `
  }
}

window.customElements.define('grampsjs-main-menu', GrampsjsMainMenu)
