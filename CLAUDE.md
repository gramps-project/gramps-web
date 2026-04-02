# Gramps Web Frontend

This is the frontend for [Gramps Web](https://www.grampsweb.org/), a genealogical research PWA. It talks to the [Gramps Web API](https://github.com/gramps-project/gramps-webapi) backend.

## Tech stack

- **[LitElement](https://lit.dev/) (Web Components)** — every UI element is a custom element
- **[Rollup](https://rollupjs.org/)** v4 for production builds (`rollup.config.js`); `@web/dev-server` for development
- **[Material Web Components](https://github.com/material-components/material-web)** — UI primitives; the codebase contains a mix of the old v1 `@material/mwc-*` (`<mwc-button>` etc.) and the new v2 `@material/web` (`<md-button>` etc.). **New code should use `md-*` elements only.**
- **[D3.js](https://d3js.org/)** — genealogical charts (fan chart, tree chart, relationship chart, Y-DNA lineage)
- **[MapLibre GL](https://maplibre.org/)** — interactive maps
- **[MDI icons](https://materialdesignicons.com/)** via `@mdi/js` — SVG path constants rendered through `<grampsjs-icon>`. The codebase also contains older `<mwc-icon>` usage. **New code should always use `<grampsjs-icon>`.**

## Development

### Dev container

The repository includes a `.devcontainer/` configuration. After opening in VS Code Dev Containers, dependencies are installed automatically. Start the dev server with:

```
npm start
```

This starts `@web/dev-server` on port 8001 with hot reload. The dev server does **not** include a backend — API calls will fail unless a backend is also running.

### Build

```
npm run build        # outputs to dist/
```

Environment variables used at build time:

- `API_URL` — backend API origin (default: empty string, i.e. same origin). In dev, the hardcoded fallback is `http://localhost:5555`.
- `BASE_DIR` — base path if the app is not served from `/`

## Project structure

```
src/
  GrampsJs.js              # Root LitElement component (<gramps-js>)
  gramps-js.js             # Entry point (registers the custom element)
  api.js                   # All API calls, auth helpers, localStorage utilities
  appState.js              # App-wide state initialisation
  config.js                # Runtime config (window.grampsjsConfig); see below
  strings.js               # i18n string keys and language list
  util.js                  # Shared helpers
  components/              # Reusable components
  views/                   # Page-level components
  mixins/                  # LitElement mixins
  charts/                  # D3.js visualisation components
lang/                      # Translation JSON files (one per language code)
test/                      # Unit tests (minimal coverage currently)
```

## Component conventions

### Naming

All component files and classes use the `Grampsjs` prefix with lowercase `js` (e.g. `GrampsjsPersonCard`, not `GrampsJsPersonCard`). A handful of older files use `GrampsJs` — these are legacy and should not be followed.

### Base classes

| Base class                             | Use for                                               |
| -------------------------------------- | ----------------------------------------------------- |
| `GrampsjsView`                         | Page-level views (only renders when `active`)         |
| `GrampsjsConnectedComponent`           | Components that fetch API data on mount               |
| `LitElement` + `GrampsjsAppStateMixin` | Everything else that needs `appState` or translations |

### Icons

Import the SVG path constant from `@mdi/js` and pass it to `<grampsjs-icon>`:

```js
import {mdiInformation} from '@mdi/js'

// in render():
html`<grampsjs-icon path="${mdiInformation}"></grampsjs-icon>`
```

Optional attributes: `color`, `height`, `width`, `rotate`.

For action icon color (add/edit/delete buttons), use `color="var(--mdc-theme-secondary)"` — this is `#0277bd` and is consistent across light and dark mode.

### Mixins

- **`GrampsjsAppStateMixin`** — adds `appState` property and the `_(key)` translation helper
- **`GrampsjsStaleDataMixin`** — marks data as stale on `db:changed` events; refetches when the component becomes active

## Data flow

Data flows down via Lit properties, and up via custom events using `fireEvent`. There is no shared mutable state between siblings — communicate through a common parent.

## State management

State is a plain object (`appState`) initialised in `appState.js` and passed down as a Lit property. There is no Redux or other store. The API methods are attached to `appState` and should always be used instead of calling `api.js` functions directly:

```js
const result = await this.appState.apiGet('/api/people/')
await this.appState.apiPost('/api/people/', payload)
await this.appState.apiPut('/api/people/handle', payload)
await this.appState.apiDelete('/api/people/handle')
```

`api.js` is still the right place to import utility helpers that are not HTTP calls: `getMediaUrl`, `getThumbnailUrl`, `getExporterUrl`, `getSettings`, `updateSettings`, `addBookmark`, etc.

## Auth

JWTs are stored in `localStorage` (`access_token`, `refresh_token`, `id_token`). The `Auth` class in `api.js` handles proactive token refresh. OIDC (OpenID Connect) login/logout is also supported.

Permissions are decoded from JWT claims and surfaced through `appState.permissions`:

```js
appState.permissions.canAdd
appState.permissions.canEdit
appState.permissions.canViewPrivate
appState.permissions.canManageUsers
appState.permissions.canUseChat
appState.permissions.canUpgradeTree
```

## i18n

All translatable text must go through the `_(key)` method (available in any component that uses `GrampsjsAppStateMixin`).

There are two sources of strings:

1. **Gramps strings** — keys that exist in the Gramps desktop app's translation system. Add them to the `grampsStrings` array in `src/strings.js`. The backend serves translated versions of these.
2. **Frontend-only strings** — add the English text to `lang/en.json`. Translations are managed via [Weblate](https://hosted.weblate.org/projects/gramps-web/).

Do not add frontend-only strings to `grampsStrings`, and do not add Gramps strings to `lang/en.json`.

## Custom events

Components communicate via window-level custom events:

| Event              | Meaning                                               |
| ------------------ | ----------------------------------------------------- |
| `db:changed`       | A mutation succeeded; stale data should be refreshed  |
| `user:loggedout`   | Auth was cleared                                      |
| `settings:changed` | User settings were updated                            |
| `grampsjs:error`   | A component encountered an error (bubbles up to root) |

Fire events with the `fireEvent(target, eventName, detail?)` helper from `util.js`.

## Runtime configuration

`src/config.js` is excluded from the bundle and copied as-is to `dist/config.js`. Deployers can mount a replacement file on top in Docker to set `window.grampsjsConfig` options (e.g. custom API URL, OAuth provider configuration). The default file just sets `window.grampsjsConfig = {}`.

## Code style

Enforced by ESLint + Prettier (run automatically on commit via husky/lint-staged):

```
npm run lint      # check
npm run format    # fix
```

Prettier config (from `package.json`): single quotes, no semicolons, no arrow-function parens for single args, no bracket spacing.

Both `.js` and `.ts` files are linted and formatted.

## TypeScript

TypeScript is optional — new files may be `.ts`, existing `.js` files stay as-is. The two coexist freely.

- Production build compiles `.ts` via `@rollup/plugin-typescript`; dev server transpiles with esbuild (no type-checking)
- Run `npm run typecheck` for a standalone type-check (also runs in CI)
- Lit components: use `@customElement`, `@property`, `@state` from `lit/decorators.js`; `experimentalDecorators` and `useDefineForClassFields: false` are already set in `tsconfig.json`

## Tests

```
npm test          # run once with coverage
npm run test:watch
```

Runner: [Vitest](https://vitest.dev/) with `happy-dom` (no browser needed), coverage via `@vitest/coverage-v8`. Tests live in `test/unit/` and cover pure functions. Import from `vitest` directly. Component tests requiring a real DOM are out of scope for now.
