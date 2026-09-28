import type {ReactiveController, ReactiveControllerHost} from 'lit'

import {
  Bounds,
  WIKIDATA_MIN_ZOOM,
  WikidataBuilding,
  containsBounds,
  padBounds,
  queryWikidataBuildings,
} from './wikidata.js'

const DEBOUNCE_MS = 400
// Buildings are fetched for the viewport plus this fraction of its size on
// every side, so small pans are served from the previous result.
const PADDING = 0.25

// Loads the Wikidata buildings for the map viewport and keeps the result.
export class WikidataBuildingsController implements ReactiveController {
  buildings: WikidataBuilding[] = []

  private host: ReactiveControllerHost

  private timer: ReturnType<typeof setTimeout> | undefined

  private abort: AbortController | undefined

  // Bounds and language of the last complete fetch.
  private fetched: {bounds: Bounds; lang: string} | null = null

  constructor(host: ReactiveControllerHost) {
    this.host = host
    host.addController(this)
  }

  hostDisconnected(): void {
    this.cancel()
  }

  // Fetches once the map has stopped moving for a moment.
  scheduleFetch(viewport: Bounds, zoom: number, lang: string): void {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.fetch(viewport, zoom, lang), DEBOUNCE_MS)
  }

  async fetch(viewport: Bounds, zoom: number, lang: string): Promise<void> {
    clearTimeout(this.timer)
    if (zoom < WIKIDATA_MIN_ZOOM) return
    const {fetched} = this
    if (fetched?.lang === lang && containsBounds(fetched.bounds, viewport)) {
      return
    }
    const padded = padBounds(viewport, PADDING)
    this.abort?.abort()
    const abort = new AbortController()
    this.abort = abort
    try {
      const res = await queryWikidataBuildings(padded, {
        lang,
        signal: abort.signal,
      })
      // A response can complete just before a newer request aborts it.
      if (abort !== this.abort) return
      if ('data' in res) {
        this.buildings = res.data
        // A truncated result is not reused, so the next move fetches again.
        this.fetched = res.truncated ? null : {bounds: padded, lang}
        this.host.requestUpdate()
      }
    } catch (e) {
      // Aborted by a newer request.
    }
  }

  cancel(): void {
    clearTimeout(this.timer)
    this.abort?.abort()
  }
}
