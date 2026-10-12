import {describe, it, expect, vi, afterEach} from 'vitest'

import {PlaceVectorsController} from '../../src/placeVectorsController.ts'

const KML_MEDIA = {
  handle: 'M1',
  mime: 'application/vnd.google-earth.kml+xml',
  checksum: 'a',
}

const kml = name => `<?xml version="1.0"?>
  <kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark>
    <name>${name}</name>
    <Point><coordinates>8,49</coordinates></Point>
  </Placemark></Document></kml>`

const placeResponse = media => ({data: {extended: {media}}})

function deferred() {
  let resolvePromise
  const promise = new Promise(resolve => {
    resolvePromise = resolve
  })
  return {promise, resolve: resolvePromise}
}

const fileResponse = text => ({ok: true, text: async () => text})

function makeController({hidden = []} = {}) {
  const host = {addController: vi.fn(), requestUpdate: vi.fn()}
  const options = {
    apiGet: vi.fn(),
    isHidden: handle => hidden.includes(handle),
    fitBounds: vi.fn(),
  }
  return {controller: new PlaceVectorsController(host, options), options}
}

const featureName = layer => layer.data.features[0].properties.name

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PlaceVectorsController', () => {
  it('drops a reload that a newer reload overtook', async () => {
    const {controller, options} = makeController()
    const older = deferred()
    const newer = deferred()
    options.apiGet.mockResolvedValue(placeResponse([KML_MEDIA]))
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockReturnValueOnce(older.promise)
        .mockReturnValueOnce(newer.promise)
    )
    const first = controller.load('P1')
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    // The file changed, so the reload downloads it again.
    options.apiGet.mockResolvedValue(
      placeResponse([{...KML_MEDIA, checksum: 'b'}])
    )
    const second = controller.reload()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    newer.resolve(fileResponse(kml('New')))
    expect(await second).to.equal('loaded')
    older.resolve(fileResponse(kml('Old')))
    expect(await first).to.equal(null)
    expect(featureName(controller.layers[0])).to.equal('New')
    expect(fetch.mock.calls[0][1].signal.aborted).to.equal(true)
  })

  it('keeps an unchanged file on reload', async () => {
    const {controller, options} = makeController()
    options.apiGet.mockResolvedValue(placeResponse([KML_MEDIA]))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => fileResponse(kml('A')))
    )
    await controller.load('P1')
    await controller.reload()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(featureName(controller.layers[0])).to.equal('A')
  })

  it('keeps the files when a reload fails', async () => {
    const {controller, options} = makeController()
    options.apiGet.mockResolvedValue(placeResponse([KML_MEDIA]))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => fileResponse(kml('A')))
    )
    await controller.load('P1')
    options.apiGet.mockResolvedValue({error: 'Server error', errorDetail: {}})
    expect(await controller.reload()).to.equal('error')
    expect(controller.layers).to.have.length(1)
  })

  it('reports a missing place and drops its files', async () => {
    const {controller, options} = makeController()
    options.apiGet.mockResolvedValue({
      error: 'Not found',
      errorDetail: {status: 404},
    })
    expect(await controller.load('P1')).to.equal('missing')
    expect(controller.layers).to.deep.equal([])
  })

  it('fits only on load and when a file is shown, not on reload', async () => {
    const {controller, options} = makeController()
    options.apiGet.mockResolvedValue(placeResponse([KML_MEDIA]))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => fileResponse(kml('A')))
    )
    await controller.load('P1', {fit: true})
    expect(options.fitBounds).toHaveBeenCalledTimes(1)
    await controller.reload()
    expect(options.fitBounds).toHaveBeenCalledTimes(1)
    await controller.show('M1')
    expect(options.fitBounds).toHaveBeenCalledTimes(2)
    await controller.show('other overlay')
    expect(options.fitBounds).toHaveBeenCalledTimes(2)
  })

  it('aborts and clears on cancel', async () => {
    const {controller, options} = makeController()
    const download = deferred()
    options.apiGet.mockResolvedValue(placeResponse([KML_MEDIA]))
    vi.stubGlobal(
      'fetch',
      vi.fn(() => download.promise)
    )
    const loading = controller.load('P1', {fit: true})
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    controller.cancel()
    download.resolve(fileResponse(kml('A')))
    expect(await loading).to.equal(null)
    expect(controller.layers).to.deep.equal([])
    expect(options.fitBounds).not.toHaveBeenCalled()
    expect(fetch.mock.calls[0][1].signal.aborted).to.equal(true)
  })
})
