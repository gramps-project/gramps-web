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
        redirect: loginRedirect && page !== 'login' ? loginRedirect : null,
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
