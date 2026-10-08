import {describe, it, expect, vi} from 'vitest'
import {render} from 'lit'
import {
  chartDataUrl,
  chartDefinitions,
  chartSettingValues,
} from '../../src/views/treeChartDefinitions.js'
import {GrampsjsViewTree} from '../../src/views/GrampsjsViewTree.js'
import {chartNameDisplayFormat} from '../../src/util.js'
import {TREE_VIEWS} from '../../src/treeDefaults.js'

const rulesOf = url =>
  JSON.parse(decodeURIComponent(/rules=([^&]*)/.exec(url)[1]))

const extendOf = url => /extend=([^&]*)/.exec(url)[1]

describe('chart definitions', () => {
  it('reads setting values from the user settings, with defaults', () => {
    const values = chartSettingValues(chartDefinitions.hourglass, {
      hourglassChartDesc: 4,
    })
    expect(values).toEqual({
      ancestors: 2,
      descendants: 4,
      orientation: 'horizontal',
      nameDisplayFormat: chartNameDisplayFormat.surnameThenGiven,
    })
  })

  it('counts a number below the minimum as the minimum', () => {
    const values = chartSettingValues(chartDefinitions.hourglass, {
      hourglassChartAnc: 0,
      hourglassChartDesc: 0,
    })
    expect(values.ancestors).toBe(1)
    expect(values.descendants).toBe(1)
    const relationship = chartSettingValues(chartDefinitions.relationship, {
      relationshipChartAnc: 0,
    })
    expect(relationship.separation).toBe(0)
  })

  it('fetches one more generation than the settings count', () => {
    const {ancestor, descendant, hourglass, fan} = chartDefinitions
    const generations = (definition, settings) =>
      rulesOf(
        chartDataUrl(
          definition,
          'I1',
          chartSettingValues(definition, settings),
          'en'
        )
      ).rules.map(rule => rule.values)
    expect(generations(ancestor, {treeChartAnc: 5})).toEqual([
      ['I1', 6],
      ['I1', 2],
    ])
    expect(generations(descendant, {descendantChartDesc: 3})).toEqual([
      ['I1', 2],
      ['I1', 4],
    ])
    expect(generations(hourglass, {})).toEqual([
      ['I1', 3],
      ['I1', 2],
    ])
    expect(generations(fan, {})).toEqual([
      ['I1', 5],
      ['I1', 2],
    ])
  })

  it('fetches people by degree of separation with all parent families for the relationship chart', () => {
    const {relationship} = chartDefinitions
    const url = chartDataUrl(
      relationship,
      'I1',
      chartSettingValues(relationship, {relationshipChartAnc: 3}),
      'de'
    )
    expect(rulesOf(url).rules).toEqual([
      {name: 'DegreesOfSeparation', values: ['I1', 3]},
    ])
    expect(extendOf(url)).toBe(
      'event_ref_list,primary_parent_family,family_list,parent_family_list'
    )
    expect(url).toContain('locale=de')
  })

  it('only allows adding people to the charts that have cards', () => {
    const editable = Object.entries(chartDefinitions)
      .filter(([, definition]) => definition.editable)
      .map(([name]) => name)
    expect(editable).toEqual([
      'ancestor',
      'descendant',
      'hourglass',
      'relationship',
    ])
  })
})

// Returns a promise with its resolve function
function deferred() {
  let resolvePromise
  const promise = new Promise(resolve => {
    resolvePromise = resolve
  })
  return {promise, resolve: resolvePromise}
}

function makeView(settings = {}) {
  const view = new GrampsjsViewTree()
  const apiGet = vi.fn()
  view.appState = {settings, i18n: {lang: 'en'}, apiGet}
  view.grampsId = 'I1'
  return {view, apiGet}
}

describe('GrampsjsViewTree', () => {
  it('fetches again only when the request changes', () => {
    const settings = {}
    const {view, apiGet} = makeView(settings)
    apiGet.mockReturnValue(new Promise(() => {}))
    view._fetchIfNeeded()
    view._fetchIfNeeded()
    expect(apiGet).toHaveBeenCalledTimes(1)
    settings.treeChartNameDisplayFormat = 'Given Surname'
    view._fetchIfNeeded()
    expect(apiGet).toHaveBeenCalledTimes(1)
    settings.treeChartAnc = 6
    view._fetchIfNeeded()
    expect(apiGet).toHaveBeenCalledTimes(2)
  })

  it('gives each setting its own input when the chart changes', () => {
    // The Material elements call attachInternals() in their constructor,
    // which happy-dom does not implement
    if (!HTMLElement.prototype.attachInternals) {
      HTMLElement.prototype.attachInternals = () => ({
        setFormValue() {},
        setValidity() {},
      })
    }
    const {view} = makeView()
    view._ = s => s
    const container = document.createElement('div')
    const inputs = () =>
      Object.fromEntries(
        [...container.querySelectorAll('[id^="setting-"]')].map(input => [
          input.id,
          input,
        ])
      )
    view._currentTabId = TREE_VIEWS.indexOf('hourglass')
    render(view.renderControls(), container)
    const hourglass = inputs()
    // The descendant chart has one setting less before the orientation
    view._currentTabId = TREE_VIEWS.indexOf('descendant')
    render(view.renderControls(), container)
    const descendant = inputs()
    expect(Object.keys(descendant)).toEqual([
      'setting-orientation',
      'setting-nameDisplayFormat',
    ])
    expect(Object.values(hourglass)).not.toContain(
      descendant['setting-nameDisplayFormat']
    )
  })

  it('records each selected person in the history, also the first one', () => {
    const {view} = makeView()
    // The first person is selected before the view is first updated
    view.willUpdate(new Map())
    view.grampsId = 'I2'
    view.willUpdate(new Map())
    expect(view._history).toEqual(['I1', 'I2'])
  })

  describe('URL', () => {
    function makeRoutedView(path, settings = {}) {
      const {view} = makeView(settings)
      view.grampsId = ''
      view.settings = settings
      view.active = true
      view.appState.path = {page: 'tree', pageId: '', pageId2: '', ...path}
      const navs = []
      view.addEventListener('nav', e => navs.push(e.detail))
      // Stands in for the app, which loads the page of each URL
      const update = () => {
        view.willUpdate(new Map())
        view.updated(new Map())
      }
      return {view, navs, update}
    }

    it('shows the chart and the person in the URL', () => {
      const {view, navs, update} = makeRoutedView(
        {pageId: 'fan', pageId2: 'I7'},
        {homePerson: 'I3', treeDefaultView: 'descendant'}
      )
      update()
      expect(view.chart).toBe('fan')
      expect(view.grampsId).toBe('I7')
      expect(navs).toEqual([])
    })

    it('completes a URL without chart or person', () => {
      const {view, navs, update} = makeRoutedView(
        {},
        {homePerson: 'I3', treeDefaultView: 'descendant'}
      )
      update()
      expect(view.chart).toBe('descendant')
      expect(view.grampsId).toBe('I3')
      expect(navs).toEqual([{path: 'tree/descendant/I3', replace: true}])
    })

    it('replaces an unknown chart in the URL with the preferred one', () => {
      const {view, navs, update} = makeRoutedView(
        {pageId: 'fan', pageId2: 'I7'},
        {homePerson: 'I3'}
      )
      update()
      view.appState.path = {page: 'tree', pageId: 'pedigree', pageId2: 'I7'}
      update()
      expect(navs).toEqual([{path: 'tree/ancestor/I7', replace: true}])
    })

    it('keeps the shown chart and person for a URL without them', () => {
      const settings = {homePerson: 'I3', treeDefaultView: 'descendant'}
      const {view, update} = makeRoutedView(
        {pageId: 'fan', pageId2: 'I7'},
        settings
      )
      update()
      view.appState.path = {page: 'tree', pageId: '', pageId2: ''}
      update()
      expect(view.chart).toBe('fan')
      expect(view.grampsId).toBe('I7')
      // A new preferred chart is used
      view.settings = {...settings, treeDefaultView: 'relationship'}
      update()
      expect(view.chart).toBe('relationship')
    })

    it('goes to the URL of a selected person or chart', () => {
      const {view, navs, update} = makeRoutedView({
        pageId: 'fan',
        pageId2: 'I7',
      })
      update()
      view._selectPerson({detail: {grampsId: 'I8'}})
      view._handleTabChange({detail: {value: 'hourglass'}})
      expect(navs).toEqual([
        {path: 'tree/fan/I8', replace: false},
        {path: 'tree/hourglass/I7', replace: false},
      ])
    })

    it('goes to the URL of a person selected while not shown', () => {
      const settings = {homePerson: 'I3', treeDefaultView: 'descendant'}
      const {view, navs, update} = makeRoutedView(
        {pageId: 'fan', pageId2: 'I7'},
        settings
      )
      view.active = false
      // The preferred chart, before the view was first shown
      view._selectPerson({detail: {grampsId: 'I8'}})
      view.active = true
      update()
      view.active = false
      // The shown chart
      view._selectPerson({detail: {grampsId: 'I9'}})
      // A new preferred chart
      view.settings = {...settings, treeDefaultView: 'relationship'}
      view._selectPerson({detail: {grampsId: 'I10'}})
      expect(navs).toEqual([
        {path: 'tree/descendant/I8', replace: false},
        {path: 'tree/fan/I9', replace: false},
        {path: 'tree/relationship/I10', replace: false},
      ])
    })

    it('goes back to the previous person in the shown chart', () => {
      const {view, navs, update} = makeRoutedView({
        pageId: 'ancestor',
        pageId2: 'I1',
      })
      update()
      view.appState.path = {page: 'tree', pageId: 'ancestor', pageId2: 'I2'}
      update()
      view.appState.path = {page: 'tree', pageId: 'hourglass', pageId2: 'I2'}
      update()
      expect(view._history).toEqual(['I1', 'I2'])
      view._prevPerson()
      expect(navs).toEqual([{path: 'tree/hourglass/I1', replace: false}])
      // An update before the URL arrives
      update()
      expect(view._history).toEqual(['I1', 'I2'])
      view.appState.path = {page: 'tree', pageId: 'hourglass', pageId2: 'I1'}
      update()
      expect(view._history).toEqual(['I1'])
      // Browser back shows I2 as a newly shown person
      view.appState.path = {page: 'tree', pageId: 'hourglass', pageId2: 'I2'}
      update()
      expect(view._history).toEqual(['I1', 'I2'])
    })

    it('waits for a home person for a URL without a person', () => {
      const {view, navs, update} = makeRoutedView({})
      update()
      expect(view.grampsId).toBe('')
      expect(navs).toEqual([{path: 'tree/ancestor', replace: true}])
      view.appState.path = {page: 'tree', pageId: 'ancestor', pageId2: ''}
      view.settings = {homePerson: 'I3'}
      update()
      expect(view.grampsId).toBe('I3')
    })
  })

  it('does not pass people fetched for one chart to another', () => {
    const {view, apiGet} = makeView()
    apiGet.mockReturnValue(new Promise(() => {}))
    view.willUpdate(new Map())
    view._data = [{handle: 'A'}]
    view._fetchIfNeeded()
    view._currentTabId = 3
    view.willUpdate(new Map())
    expect(view._data).toEqual([])
    view._fetchIfNeeded()
    expect(apiGet).toHaveBeenCalledTimes(2)
  })

  it('shows the previous person while the selected person is loading', () => {
    const {view} = makeView()
    view._data = [
      {gramps_id: 'I1', profile: {name_given: 'Ann', name_surname: 'Lee'}},
    ]
    view.willUpdate(new Map())
    view.grampsId = 'I2'
    view.willUpdate(new Map())
    expect(view._selectedPerson.gramps_id).toBe('I1')
    view._data = [{gramps_id: 'I2', profile: {name_given: 'Bo'}}]
    view.willUpdate(new Map())
    expect(view._selectedPerson.gramps_id).toBe('I2')
  })

  it('opens the page of the shown person while the selected person is loading', () => {
    const {view} = makeView()
    view._data = [{gramps_id: 'I1', profile: {name_given: 'Ann'}}]
    view.willUpdate(new Map())
    view.grampsId = 'I2'
    view.willUpdate(new Map())
    const paths = []
    view.addEventListener('nav', e => paths.push(e.detail.path))
    view._goToPerson()
    expect(paths).toEqual(['person/I1'])
  })

  describe('viewport keys', () => {
    const keyEvent = (
      key,
      {target = document.body, path, ...modifiers} = {}
    ) => ({
      key,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      ...modifiers,
      composedPath: () => path ?? [target],
      preventDefault: vi.fn(),
    })

    function makeKeyView() {
      const {view} = makeView()
      view.active = true
      const viewport = {
        zoomBy: vi.fn(),
        panBy: vi.fn(),
        fit: vi.fn(),
        centreRoot: vi.fn(),
      }
      view._chartViewport = () => viewport
      return {view, viewport}
    }

    it('zooms, moves and fits the chart', () => {
      const {view, viewport} = makeKeyView()
      for (const key of ['+', '=', '-', 'ArrowRight', 'ArrowUp', '0']) {
        view._handleChartKey(keyEvent(key))
      }
      expect(viewport.zoomBy.mock.calls.map(([factor]) => factor)).toEqual([
        1.25, 1.25, 0.8,
      ])
      expect(viewport.panBy.mock.calls.map(([dx, dy]) => [dx, dy])).toEqual([
        [-100, 0],
        [0, 100],
      ])
      expect(viewport.fit).toHaveBeenCalledOnce()
    })

    it('leaves keys with modifiers, in fields, tabs and menus alone', () => {
      const {view, viewport} = makeKeyView()
      const input = document.createElement('input')
      // Only the tag name of the chart switcher matters
      const tabs = {tagName: 'GRAMPSJS-PILL-TOGGLE'}
      const events = [
        keyEvent('+', {ctrlKey: true}),
        keyEvent('-', {metaKey: true}),
        keyEvent('+', {target: input}),
        keyEvent('ArrowLeft', {path: [document.body, tabs]}),
      ]
      for (const event of events) {
        view._handleChartKey(event)
        expect(event.preventDefault).not.toHaveBeenCalled()
      }
      expect(viewport.zoomBy).not.toHaveBeenCalled()
      expect(viewport.panBy).not.toHaveBeenCalled()
    })

    it('leaves keys alone while the view is not active', () => {
      const {view, viewport} = makeKeyView()
      view.active = false
      view._handleChartKey(keyEvent('+'))
      expect(viewport.zoomBy).not.toHaveBeenCalled()
    })

    it('has no viewport for the fan chart', () => {
      const {view} = makeView()
      view._currentTabId = 4
      expect(view._chartViewport()).toBeUndefined()
    })
  })

  it('ignores a response that arrives after a newer request was sent', async () => {
    const {view, apiGet} = makeView()
    const first = deferred()
    const second = deferred()
    apiGet
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    view._fetchIfNeeded()
    view.grampsId = 'I2'
    view._fetchIfNeeded()
    second.resolve({data: [{handle: 'B'}]})
    first.resolve({data: [{handle: 'A'}]})
    await Promise.all([first.promise, second.promise])
    await Promise.resolve()
    expect(view._data).toEqual([{handle: 'B'}])
    expect(view.loading).toBe(false)
  })
})

describe('expanded branches', () => {
  const flush = () => new Promise(resolve => setTimeout(resolve))

  // A view of the ancestor chart of R (I1), with R and F (I2)
  function makeBranchView() {
    const {view, apiGet} = makeView()
    view.willUpdate(new Map())
    view._data = [
      {handle: 'R', gramps_id: 'I1'},
      {handle: 'F', gramps_id: 'I2'},
    ]
    apiGet.mockResolvedValue({
      data: [
        {handle: 'R', gramps_id: 'I1'},
        {handle: 'F', gramps_id: 'I2'},
        {handle: 'FF', gramps_id: 'I3'},
      ],
    })
    const expand = (handle, direction = 'ancestors') =>
      view._expandBranch({detail: {handle, direction}})
    return {view, apiGet, expand}
  }

  const lastRules = apiGet => rulesOf(apiGet.mock.calls.at(-1)[0]).rules

  it('fetches the people of the chart with those of the expanded branches', async () => {
    const {view, apiGet, expand} = makeBranchView()
    expand('F')
    expect(lastRules(apiGet)).toEqual([
      {name: 'IsLessThanNthGenerationAncestorOf', values: ['I1', 4]},
      {name: 'IsLessThanNthGenerationDescendantOf', values: ['I1', 2]},
      {name: 'IsLessThanNthGenerationAncestorOf', values: ['I2', 2]},
    ])
    // A second click while loading does not fetch again
    expand('F')
    expect(apiGet).toHaveBeenCalledTimes(1)
    // The branch opens with the people it needs
    expect(view._expanded.size).toBe(0)
    await flush()
    expect(view._data.map(person => person.handle)).toEqual(['R', 'F', 'FF'])
    expect([...view._expanded]).toEqual(['F'])
  })

  it('fetches children for a branch of descendants', () => {
    const {apiGet, expand} = makeBranchView()
    expand('F', 'descendants')
    expect(lastRules(apiGet).at(-1)).toEqual({
      name: 'IsLessThanNthGenerationDescendantOf',
      values: ['I2', 2],
    })
  })

  it('keeps the expanded branches when the people are fetched again', async () => {
    const {view, apiGet, expand} = makeBranchView()
    expand('F')
    await flush()
    view.handleUpdateStaleData()
    expect(apiGet).toHaveBeenCalledTimes(2)
    expect(lastRules(apiGet)).toHaveLength(3)
    await flush()
    expect([...view._expanded]).toEqual(['F'])
  })

  it('forgets the branches of another person', async () => {
    const {view, apiGet, expand} = makeBranchView()
    expand('F')
    await flush()
    view.grampsId = 'I2'
    view.willUpdate(new Map())
    expect(view._expanded.size).toBe(0)
    view._fetchIfNeeded()
    expect(lastRules(apiGet)).toHaveLength(2)
  })
})
