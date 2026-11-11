// Top-level view routing for <gramps-js>.
//
// The loading states and the pure `selectPreReadyView` decision function live
// here (rather than inside GrampsJs.js) so the routing table can be unit-tested
// without mounting the whole component tree. GrampsJs.js imports these and
// keeps the DOM/window side-effects (history navigation, rendering) in the
// component itself.

export const LOADING_STATE_INITIAL = 0
export const LOADING_STATE_UNAUTHORIZED = 1
export const LOADING_STATE_UNAUTHORIZED_NOCONNECTION = 2
export const LOADING_STATE_NO_OWNER = 3
export const LOADING_STATE_DB_SCHEMA_MISMATCH = 4
export const LOADING_STATE_NO_TREE = 5
export const LOADING_STATE_READY = 10

// Decide which pre-ready view (if any) to show for a given loading state.
//
// Pure: no `this`, no window, no rendering. Returns an object describing the
// decision that the caller turns into navigation + rendering:
//   {view}                       - which view to render
//   {view, navigateTo}           - also replace the URL with `navigateTo`
//                                  (null means the URL is already correct)
//   {view, navigateTo, redirect} - `redirect` is an external URL to send the
//                                  browser to (loginRedirect config)
//   {view: 'continue'}           - not a pre-ready blocking state; the caller
//                                  should fall through to its ready/housekeeping
//                                  logic (schema mismatch, main app, etc.)
export function selectPreReadyView(
  loadingState,
  {page, permissions = {}, frontendConfig = {}} = {}
) {
  switch (loadingState) {
    case LOADING_STATE_INITIAL:
      return {view: 'initial'}
    case LOADING_STATE_UNAUTHORIZED_NOCONNECTION:
      return {view: 'noconn'}
    case LOADING_STATE_UNAUTHORIZED: {
      if (page === 'register') {
        return {view: 'register'}
      }
      const {loginRedirect} = frontendConfig
      return {
        view: 'login',
        navigateTo: page !== 'login' ? 'login' : null,
        // On firstrun the app explains that an owner already exists, which an
        // external redirect would hide.
        redirect:
          loginRedirect && !['login', 'firstrun'].includes(page)
            ? loginRedirect
            : null,
      }
    }
    case LOADING_STATE_NO_OWNER:
      return {
        view: 'firstrun',
        navigateTo: page !== 'firstrun' ? 'firstrun' : null,
      }
    case LOADING_STATE_NO_TREE:
      return {
        // Only server Administrators (canViewOtherTree) can create a tree;
        // everyone else waits for one to be assigned.
        view: permissions.canViewOtherTree ? 'create-tree' : 'no-tree-wait',
        navigateTo: page !== 'create-tree' ? 'create-tree' : null,
      }
    default:
      return {view: 'continue'}
  }
}

// The tree named by /login/<tree> or /register/<tree>. The login view is also
// shown in place of any other page, e.g. after logging out, and the ID of that
// page is not a tree.
export function treeFromPath({page, pageId} = {}) {
  return ['login', 'register'].includes(page) ? pageId ?? '' : ''
}

// Pages where the Gramps ID is used as the page title
export const OBJECT_PAGES = new Set([
  'person',
  'family',
  'event',
  'place',
  'source',
  'citation',
  'repository',
  'media',
  'note',
  'task',
])

// Map from route name to translatable title string
export const PAGE_TITLES = {
  home: 'Home',
  blog: 'Blog',
  people: 'People',
  families: 'Families',
  events: 'Events',
  places: 'Places',
  sources: 'Sources',
  citations: 'Citations',
  repositories: 'Repositories',
  notes: 'Notes',
  medialist: 'Media',
  map: 'Map',
  timeline: 'Timeline',
  tree: 'Family Tree',
  'dna-matches': 'DNA',
  'dna-chromosome': 'DNA',
  ydna: 'DNA',
  chat: 'Assistant',
  recent: 'History',
  bookmarks: '_Bookmarks',
  tasks: 'Tasks',
  notifications: 'Notifications',
  tags: 'Tags',
  export: 'Export',
  reports: '_Reports',
  report: '_Reports',
  revisions: 'Revisions',
  revision: 'Revisions',
  search: 'Search',
  settings: 'Settings',
  help: 'Help',
  anniversaries: 'Anniversaries',
}

// Pages listed under "Lists" in the main menu
export const LISTS_PAGES = [
  'people',
  'families',
  'events',
  'places',
  'citations',
  'sources',
  'repositories',
  'notes',
]

// The list page that each object page belongs to, as [title, path]
const OBJECT_LIST_PAGES = {
  person: ['People', 'people'],
  family: ['Families', 'families'],
  event: ['Events', 'events'],
  place: ['Places', 'places'],
  source: ['Sources', 'sources'],
  citation: ['Citations', 'citations'],
  repository: ['Repositories', 'repositories'],
  note: ['Notes', 'notes'],
  media: ['Media', 'medialist'],
  task: ['Tasks', 'tasks'],
  revision: ['Revisions', 'revisions'],
}

// Pages whose own title comes from their data, such as a report's name, as
// [title, path] of the page they belong to
const DETAIL_PAGES = {
  report: ['_Reports', 'reports'],
}

export const SETTINGS_TABS = {
  user: 'User settings',
  administration: 'Administration',
  users: 'Manage users',
  info: 'System Information',
}

// The title a view reported for the page it shows ({page, pageId, title}),
// when that is the current page
export function pageTitleDetail({page, pageId}, pageTitle) {
  if (pageTitle?.page === page && pageTitle?.pageId === pageId) {
    return pageTitle.title ?? ''
  }
  return ''
}

// The parts of a page's title in the top app bar, from the outermost one.
// Each is {title, href, literal}: href leads to the page the part names, and
// a literal title, such as a Gramps ID, is shown without translation. A page
// in DETAIL_PAGES ends with `detail`, the title its view reported, once known.
export function pageTitleParts({page, pageId}, detail = '') {
  if (page in DETAIL_PAGES && detail) {
    const [title, path] = DETAIL_PAGES[page]
    return [{title, href: `/${path}`}, {title: detail}]
  }
  if (page in OBJECT_LIST_PAGES && pageId) {
    const [title, path] = OBJECT_LIST_PAGES[page]
    return [
      {title, href: `/${path}`},
      {title: pageId, literal: true},
    ]
  }
  if (LISTS_PAGES.includes(page)) {
    return [{title: 'Lists', href: '/people'}, {title: PAGE_TITLES[page]}]
  }
  if (page === 'settings' && pageId in SETTINGS_TABS) {
    return [
      {title: 'Settings', href: '/settings/user'},
      {title: SETTINGS_TABS[pageId]},
    ]
  }
  const title = PAGE_TITLES[page]
  return title ? [{title}] : []
}
