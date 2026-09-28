import {describe, it, expect, vi, beforeEach} from 'vitest'

import {GrampsjsViewMap} from '../../src/views/GrampsjsViewMap.js'
import {WIKIDATA_LAYER_HANDLE} from '../../src/components/GrampsjsMapWikidataLayer.js'

const PLACES = [
  {handle: 'P1', profile: {name: 'Heidelberg', lat: 49.4, long: 8.7}},
  {handle: 'P2', profile: {name: 'Berlin', lat: 52.5, long: 13.4}},
  {handle: 'P3', profile: {name: 'Nowhere', lat: null, long: null}},
]

const PERSON = {
  handle: 'I1',
  profile: {name_given: 'Anna', name_surname: 'Muster'},
}

const PERSON_DATA = {
  handle: 'I1',
  extended: {events: [{place: 'P1'}, {place: 'P3'}, {}]},
}

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

function deferred() {
  let resolvePromise
  const promise = new Promise(resolve => {
    resolvePromise = resolve
  })
  return {promise, resolve: resolvePromise}
}

// A map view that is never attached to the document, so nothing renders;
// the search box and the map are stubs.
function makeView() {
  const view = new GrampsjsViewMap()
  const map = {
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    jumpTo: vi.fn(),
    _map: {resize: vi.fn()},
  }
  const searchbox = {
    showDetails: vi.fn(),
    focus: vi.fn(),
    clear: vi.fn(() => view._handleSearchClear()),
  }
  Object.defineProperty(view, '_mapEl', {value: map})
  Object.defineProperty(view, '_searchbox', {value: searchbox})
  view.appState = {
    i18n: {lang: 'en', strings: {}},
    apiGet: vi.fn(),
    dbInfo: {},
  }
  view._dataPlaces = PLACES
  view._filteredPlaces = PLACES
  return {view, map, searchbox}
}

async function selectLoadedPerson(view) {
  view.appState.apiGet.mockResolvedValue({data: PERSON_DATA})
  view._handlePersonSelected(PERSON)
  await flushPromises()
}

beforeEach(() => {
  localStorage.removeItem('grampsjs_map_viewport')
  localStorage.removeItem('grampsjs_map_layers')
})

describe('map view: places', () => {
  it('selects a place from the search, highlights it and flies there', () => {
    const {view, map, searchbox} = makeView()
    view._handlePlaceSelected(PLACES[0])
    expect(view._selection).to.deep.equal({type: 'place', handle: 'P1'})
    expect(view._highlightedHandles).to.deep.equal(['P1'])
    expect(view._valueSearch).to.equal('Heidelberg')
    expect(searchbox.showDetails).toHaveBeenCalled()
    expect(map.flyTo).toHaveBeenCalledWith(49.4, 8.7)
  })

  it('selects a clicked marker without flying', () => {
    const {view, map} = makeView()
    view._handleMapMarkerClicked({detail: {handle: 'P2'}})
    expect(view._selection).to.deep.equal({type: 'place', handle: 'P2'})
    expect(map.flyTo).not.toHaveBeenCalled()
  })

  it('shows a selected place that the time filter hides', () => {
    const {view} = makeView()
    view._filteredPlaces = [PLACES[1]]
    view._handlePlaceSelected(PLACES[0])
    expect(view._placesForMap.map(p => p.handle)).to.have.members(['P1', 'P2'])
  })

  it('selects a place opened from another page', async () => {
    const {view} = makeView()
    view._handleExternalPlaceSelected({detail: PLACES[1]})
    await vi.waitFor(() =>
      expect(view._selection).to.deep.equal({type: 'place', handle: 'P2'})
    )
  })
})

describe('map view: persons', () => {
  it('shows the person first and their places once loaded', async () => {
    const {view, map} = makeView()
    const request = deferred()
    view.appState.apiGet.mockReturnValue(request.promise)
    view._handlePersonSelected(PERSON)
    expect(view._selection.type).to.equal('person')
    expect(view._selection.data).to.equal(null)
    expect(view._valueSearch).to.equal('Anna Muster')

    request.resolve({data: PERSON_DATA})
    await flushPromises()
    expect(view._selection.data).to.equal(PERSON_DATA)
    expect(view._selection.placeHandles).to.deep.equal(['P1', 'P3'])
    // The only place with coordinates is shown and flown to.
    expect(view._placesForMap.map(p => p.handle)).to.deep.equal(['P1'])
    expect(map.flyTo).toHaveBeenCalledWith(49.4, 8.7)
  })

  it('shows the person places regardless of the time filter', async () => {
    const {view} = makeView()
    view._filteredPlaces = []
    await selectLoadedPerson(view)
    expect(view._personSelection).not.to.equal(null)
    expect(view._placesForMap.map(p => p.handle)).to.deep.equal(['P1'])
  })

  it('ignores a person response after another selection', async () => {
    const {view, map} = makeView()
    const request = deferred()
    view.appState.apiGet.mockReturnValue(request.promise)
    view._handlePersonSelected(PERSON)
    view._handlePlaceSelected(PLACES[1])
    request.resolve({data: PERSON_DATA})
    await flushPromises()
    expect(view._selection).to.deep.equal({type: 'place', handle: 'P2'})
    expect(map.flyTo).toHaveBeenCalledTimes(1)
    expect(map.flyTo).toHaveBeenCalledWith(52.5, 13.4)
  })

  it('clears the selection when the person fails to load', async () => {
    const {view} = makeView()
    view.appState.apiGet.mockResolvedValue({error: 'Not found'})
    view._handlePersonSelected(PERSON)
    await flushPromises()
    expect(view._selection).to.equal(null)
  })

  it('highlights the place hovered in the person panel', async () => {
    const {view} = makeView()
    await selectLoadedPerson(view)
    view._handlePlaceActive({detail: {handle: 'P1'}})
    expect(view._highlightedHandles).to.deep.equal(['P1'])
    view._handlePlaceActive({detail: {}})
    expect(view._highlightedHandles).to.deep.equal([])
  })

  it('drops the hover highlight on a new selection', async () => {
    const {view} = makeView()
    await selectLoadedPerson(view)
    view._handlePlaceActive({detail: {handle: 'P1'}})
    view._handlePlaceSelected(PLACES[1])
    expect(view._hoveredPlace).to.equal('')
    expect(view._highlightedHandles).to.deep.equal(['P2'])
  })

  it('selects a person opened from another page', async () => {
    const {view} = makeView()
    view.appState.apiGet.mockResolvedValue({data: PERSON_DATA})
    view._handleExternalPersonSelected({detail: {person: PERSON}})
    await vi.waitFor(() => expect(view._selection?.data).to.equal(PERSON_DATA))
  })
})

describe('map view: other selections', () => {
  it('clears the selection for a Nominatim result and flies there', () => {
    const {view, map} = makeView()
    view._handlePlaceSelected(PLACES[0])
    view._handleExternalSelected({lat: '50.1', long: '9.2', name: 'Town'})
    expect(view._selection).to.equal(null)
    expect(view._valueSearch).to.equal('Town')
    expect(map.flyTo).toHaveBeenLastCalledWith(50.1, 9.2)
  })

  it('selects a Wikidata building and replaces it with a place', () => {
    const {view, searchbox} = makeView()
    view._handleWikidataClicked({detail: {qid: 'Q1', label: 'Old house'}})
    expect(view._selection).to.deep.equal({
      type: 'wikidata',
      qid: 'Q1',
      label: 'Old house',
    })
    expect(view._highlightedHandles).to.deep.equal([])
    expect(searchbox.showDetails).toHaveBeenCalled()
    view._handlePlaceSelected(PLACES[0])
    expect(view._selection.type).to.equal('place')
  })

  it('closes a selected building when its layer is switched off', () => {
    const {view, searchbox} = makeView()
    view._handleWikidataClicked({detail: {qid: 'Q1', label: 'Old house'}})
    view._handleOverlayToggle({
      detail: {overlay: {handle: WIKIDATA_LAYER_HANDLE}, visible: false},
    })
    expect(searchbox.clear).toHaveBeenCalled()
    expect(view._selection).to.equal(null)
  })

  it('clears everything when the search is cleared', async () => {
    const {view} = makeView()
    await selectLoadedPerson(view)
    view._handlePlaceActive({detail: {handle: 'P1'}})
    view._handleSearchClear()
    expect(view._selection).to.equal(null)
    expect(view._highlightedHandles).to.deep.equal([])
    expect(view._valueSearch).to.equal('')
  })
})

describe('map view: loading places', () => {
  it('centres a first visit on the places', async () => {
    const {view, map} = makeView()
    view._getPlaces = vi.fn().mockResolvedValue({data: PLACES})
    await view._fetchPlaces()
    expect(map.jumpTo).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      6
    )
  })

  it('does not move the map when a place is selected', async () => {
    const {view, map} = makeView()
    view._handlePlaceSelected(PLACES[0])
    view._getPlaces = vi.fn().mockResolvedValue({data: PLACES})
    await view._fetchPlaces()
    expect(map.jumpTo).not.toHaveBeenCalled()
  })

  it('fits the map to a loaded person when places arrive', async () => {
    const {view, map} = makeView()
    await selectLoadedPerson(view)
    map.flyTo.mockClear()
    view._getPlaces = vi.fn().mockResolvedValue({data: PLACES})
    await view._fetchPlaces()
    expect(map.flyTo).toHaveBeenCalledWith(49.4, 8.7)
    expect(map.jumpTo).not.toHaveBeenCalled()
  })
})

// A Gramps date object for 1 January of the given year.
const date = year => ({
  calendar: 0,
  modifier: 0,
  quality: 0,
  dateval: [1, 1, year, false],
  sortval: 1,
  text: '',
})

function withEvents(view) {
  // P1 has an event in 1850, P2 in 1950, P3 none.
  view._eventsByPlace = new Map([
    ['P1', [{place: 'P1', date: date(1850)}]],
    ['P2', [{place: 'P2', date: date(1950)}]],
  ])
}

describe('map view: time filter', () => {
  it('filters places to the selected years while enabled', () => {
    const {view} = makeView()
    withEvents(view)
    view._handleTimeSliderChange({
      detail: {value: 1860, span: 25, enabled: true},
    })
    expect(view._filteredPlaces.map(p => p.handle)).to.deep.equal(['P1'])
  })

  it('shows all places while disabled, keeping the span', () => {
    const {view} = makeView()
    withEvents(view)
    view._handleTimeSliderChange({
      detail: {value: 1860, span: 25, enabled: false},
    })
    expect(view._filteredPlaces.map(p => p.handle)).to.deep.equal([
      'P1',
      'P2',
      'P3',
    ])
    expect(view._yearSpan).to.equal(25)
    expect(view._timeFilterActive).to.equal(false)
  })

  it('does not apply the time filter while a person is selected', async () => {
    const {view} = makeView()
    view._handleTimeSliderChange({
      detail: {value: 1860, span: 25, enabled: true},
    })
    expect(view._timeFilterActive).to.equal(true)
    await selectLoadedPerson(view)
    expect(view._timeFilterActive).to.equal(false)
  })
})

describe('map view: layer settings', () => {
  it('starts with the base map and the building layer off', () => {
    const {view} = makeView()
    expect(view._mapStyle).to.equal('base')
    expect(view._wikidataVisible).to.equal(false)
  })

  it('remembers the building layer and the map style', () => {
    const {view} = makeView()
    view._handleOverlayToggle({
      detail: {overlay: {handle: WIKIDATA_LAYER_HANDLE}, visible: true},
    })
    view._handleLayerChange({detail: {style: 'ohm'}})

    const {view: reloaded} = makeView()
    expect(reloaded._wikidataVisible).to.equal(true)
    expect(reloaded._mapStyle).to.equal('ohm')
  })

  it('remembers a hidden map overlay', () => {
    const {view} = makeView()
    view._handleOverlayToggle({
      detail: {overlay: {handle: 'M1'}, visible: false},
    })
    const {view: reloaded} = makeView()
    expect(reloaded._hiddenOverlaysHandles).to.include('M1')
  })
})

describe('map view: building status', () => {
  const bounds = {
    getWest: () => 8,
    getSouth: () => 49,
    getEast: () => 9,
    getNorth: () => 50,
  }
  const buildings = [
    {
      qid: 'Q1',
      lat: 49.5,
      long: 8.5,
      inceptionYear: 1900,
      demolishedYear: null,
    },
    {
      qid: 'Q2',
      lat: 49.5,
      long: 8.5,
      inceptionYear: null,
      demolishedYear: null,
    },
    {qid: 'Q3', lat: 51, long: 8.5, inceptionYear: null, demolishedYear: null},
  ]

  function makeZoomedView() {
    const {view} = makeView()
    view._bounds = bounds
    view._zoom = 15
    view._wikidata.buildings = buildings
    return view
  }

  it('asks to zoom in below the minimum zoom', () => {
    const view = makeZoomedView()
    view._zoom = 12
    expect(view._wikidataStatus).to.equal('Zoom in to see Wikidata buildings')
  })

  it('shows that buildings are loading', () => {
    const view = makeZoomedView()
    view._wikidata.loading = true
    expect(view._wikidataStatus).to.equal('Loading...')
  })

  it('shows no status while buildings are in view', () => {
    const view = makeZoomedView()
    expect(view._wikidataStatus).to.equal('')
  })

  it('says so when no building is in view', () => {
    const view = makeZoomedView()
    view._wikidata.buildings = [buildings[2]]
    expect(view._wikidataStatus).to.equal('No buildings here')
  })

  it('counts only buildings matching the time filter', () => {
    const view = makeZoomedView()
    view._wikidata.buildings = [buildings[0]]
    view._handleTimeSliderChange({
      detail: {value: 1850, span: 25, enabled: true},
    })
    expect(view._wikidataStatus).to.equal('No buildings here')
  })
})
