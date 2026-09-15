import {describe, it, expect, vi} from 'vitest'
import {Graphviz} from '@hpcc-js/wasm'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'
import {layoutRelationships} from '../../src/charts/layout/relationshipLayout.js'

vi.mock('@hpcc-js/wasm', () => ({Graphviz: {load: vi.fn()}}))

// X is the only person, so the layout has a single node
const graph = new FamilyGraph([{handle: 'X', gramps_id: 'I_X'}])
const output = {
  bb: '0,0,20,10',
  objects: [{name: 'node_p_XxX', pos: '10,5'}],
  edges: [],
}

describe('layoutRelationships loading Graphviz', () => {
  it('loads Graphviz again after a failed load', async () => {
    Graphviz.load
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({layout: () => JSON.stringify(output)})
    await expect(layoutRelationships(graph, 'X')).rejects.toThrow('offline')
    const layout = await layoutRelationships(graph, 'X')
    expect(layout.root).toMatchObject({handle: 'X', x: 0, y: 0})
    expect(Graphviz.load).toHaveBeenCalledTimes(2)
  })
})
