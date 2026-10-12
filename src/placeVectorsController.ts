import type {ReactiveController, ReactiveControllerHost} from 'lit'

import {fetchVector, vectorBounds, vectorFormat} from './mapVector.js'

export interface VectorMedia {
  handle: string
  gramps_id?: string
  desc?: string
  mime?: string
  path?: string
  checksum?: string
}

export interface VectorLayer {
  handle: string
  media: VectorMedia
  // A GeoJSON FeatureCollection; null until downloaded.
  data: object | null
  loading: boolean
}

type ApiResult =
  | {data: {extended?: {media?: VectorMedia[]}}}
  | {error: string; errorDetail?: {status?: number}}

// 'missing' means the place no longer exists; null that a newer load or
// cancel() superseded this one.
export type LoadResult = 'loaded' | 'missing' | 'error' | null

export interface PlaceVectorsOptions {
  apiGet: (endpoint: string) => Promise<ApiResult>
  isHidden: (handle: string) => boolean
  // Called with [[west, south], [east, north]] to move the map.
  fitBounds: (bounds: number[][]) => void
}

// Loads the KML and GeoJSON files of a place. Files are downloaded only
// once they are not hidden. A new load or cancel() aborts the previous
// load and its downloads, whose results are dropped.
export class PlaceVectorsController implements ReactiveController {
  layers: VectorLayer[] = []

  private host: ReactiveControllerHost

  private options: PlaceVectorsOptions

  private handle = ''

  // Whether the map fits the files, for a place without coordinates.
  private fit = false

  // Owns the current place load and every download for it.
  private abort: AbortController | undefined

  constructor(host: ReactiveControllerHost, options: PlaceVectorsOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  hostDisconnected(): void {
    this.cancel()
  }

  async load(handle: string, {fit = false} = {}): Promise<LoadResult> {
    this.handle = handle
    this.fit = fit
    const result = await this.reload()
    if (result === 'loaded' && this.fit) this.fitVisible()
    return result
  }

  // Loads the current place again, keeping files that have not changed.
  // The map stays where it is.
  async reload(): Promise<LoadResult> {
    if (!this.handle) return null
    this.abort?.abort()
    const abort = new AbortController()
    this.abort = abort
    const res = await this.options.apiGet(
      `/api/places/${this.handle}?extend=media_list`
    )
    if (abort !== this.abort) return null
    if (!('data' in res)) {
      if (res.errorDetail?.status !== 404) return 'error'
      this.layers = []
      this.host.requestUpdate()
      return 'missing'
    }
    const previous = new Map(this.layers.map(l => [l.handle, l]))
    // A place can reference the same file more than once.
    const media = new Map(
      (res.data.extended?.media ?? [])
        .filter(obj => vectorFormat(obj))
        .map(obj => [obj.handle, obj])
    )
    this.layers = [...media.values()].map(obj => {
      const old = previous.get(obj.handle)
      const unchanged = old?.data && old.media.checksum === obj.checksum
      return {
        handle: obj.handle,
        media: obj,
        data: unchanged ? old.data : null,
        loading: false,
      }
    })
    this.host.requestUpdate()
    return (await this.downloadVisible(abort)) ? 'loaded' : null
  }

  // Shows a file that was switched on. A place without coordinates then fits
  // the files shown.
  async show(handle: string): Promise<void> {
    const {abort} = this
    if (!abort || !this.layers.some(l => l.handle === handle)) return
    if ((await this.downloadVisible(abort)) && this.fit) this.fitVisible()
  }

  // Downloads the files that are not hidden and not loaded yet; false if a
  // newer load superseded the downloads.
  private async downloadVisible(abort: AbortController): Promise<boolean> {
    const pending = this.layers.filter(
      l => !l.data && !l.loading && !this.options.isHidden(l.handle)
    )
    if (pending.length === 0) return abort === this.abort
    const pendingHandles = new Set(pending.map(l => l.handle))
    this.updateLayers(pendingHandles, l => ({...l, loading: true}))
    const results = await Promise.all(
      pending.map(l => fetchVector(l.media, {signal: abort.signal}))
    )
    if (abort !== this.abort) return false
    const dataByHandle = new Map(
      results.filter(r => r !== null).map(r => [r.handle, r.data])
    )
    this.updateLayers(pendingHandles, l => ({
      ...l,
      data: dataByHandle.get(l.handle) ?? null,
      loading: false,
    }))
    return true
  }

  cancel(): void {
    this.abort?.abort()
    this.abort = undefined
    this.handle = ''
    this.fit = false
    if (this.layers.length > 0) {
      this.layers = []
      this.host.requestUpdate()
    }
  }

  private fitVisible(): void {
    const shown = this.layers
      .filter(l => l.data && !this.options.isHidden(l.handle))
      .map(l => l.data)
    const bounds = vectorBounds(shown)
    if (bounds) this.options.fitBounds(bounds)
  }

  private updateLayers(
    handles: Set<string>,
    fn: (layer: VectorLayer) => VectorLayer
  ): void {
    this.layers = this.layers.map(l => (handles.has(l.handle) ? fn(l) : l))
    this.host.requestUpdate()
  }
}
