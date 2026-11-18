import {describe, it, expect, vi, afterEach} from 'vitest'
import '../../src/components/GrampsjsFilterBuilder.js'
import '../../src/components/GrampsjsFilterParam.js'
import {newCondition, newGroup} from '../../src/filterBuilder.js'

const ancestors = {
  rule: 'IsAncestorOf',
  name: 'Ancestors of <person>',
  description: '',
  category: 'Ancestral filters',
  labels: ['ID:', 'Inclusive:'],
  types: [{type: 'id', namespace: 'Person'}, {type: 'boolean'}],
}

// an API without the person I9
function makeAppState() {
  return {
    i18n: {strings: {}, lang: 'en'},
    apiGet: vi.fn(async url => {
      if (url.startsWith('/api/filters/')) {
        return {data: {rules: [ancestors]}}
      }
      if (url.startsWith('/api/people/')) {
        return {data: []}
      }
      return {data: []}
    }),
  }
}

async function settle(element) {
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => {
      setTimeout(resolve, 0)
    })
    // eslint-disable-next-line no-await-in-loop
    await element.updateComplete
  }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('missing objects in the condition builder', () => {
  it('marks a parameter whose object is missing', async () => {
    const param = document.createElement('grampsjs-filter-param')
    param.appState = makeAppState()
    param.paramType = {type: 'id', namespace: 'Person'}
    param.value = 'I9'
    const events = []
    param.addEventListener('filter-param:missing', e => events.push(e.detail))
    document.body.appendChild(param)
    await settle(param)
    expect(events).toEqual([{value: 'I9'}])
    expect(param.renderRoot.querySelector('.missing').textContent).toContain(
      'I9: Not found'
    )
  })

  it('does not mark a parameter whose lookup failed', async () => {
    const param = document.createElement('grampsjs-filter-param')
    param.appState = {
      ...makeAppState(),
      apiGet: vi.fn(async () => ({error: 'Network error'})),
    }
    param.paramType = {type: 'id', namespace: 'Person'}
    param.value = 'I9'
    const events = []
    param.addEventListener('filter-param:missing', e => events.push(e.detail))
    document.body.appendChild(param)
    await settle(param)
    expect(events).toEqual([])
    expect(param.renderRoot.querySelector('.missing')).toBe(null)
  })

  it('disables Apply when an opened filter refers to a missing object', async () => {
    const builder = document.createElement('grampsjs-filter-builder')
    builder.appState = makeAppState()
    builder.namespace = 'people'
    document.body.appendChild(builder)
    await builder.updateComplete
    const tree = newGroup()
    tree.children = [newCondition('IsAncestorOf', ['I9', '0'])]
    builder.open(tree)
    await settle(builder)
    const param = builder.renderRoot.querySelector('grampsjs-filter-param')
    await settle(param)
    await settle(builder)
    expect(builder._missingIds.has('Person:I9')).toBe(true)
    const apply = builder.renderRoot.querySelector('md-filled-button')
    expect(apply.disabled).toBe(true)
  })

  it('marks rules missing from the catalogue', async () => {
    const builder = document.createElement('grampsjs-filter-builder')
    builder.appState = makeAppState()
    builder.namespace = 'people'
    document.body.appendChild(builder)
    await builder.updateComplete
    const tree = newGroup()
    tree.children = [newCondition('HasGone', ['x'])]
    builder.open(tree)
    await settle(builder)
    const error = builder.renderRoot.querySelector('.condition .error')
    expect(error.textContent).toContain('Unknown rule')
    const apply = builder.renderRoot.querySelector('md-filled-button')
    expect(apply.disabled).toBe(true)
  })
})
