import {describe, it, expect} from 'vitest'
import {stripChatHistoryRaw} from '../../src/chatHistory.js'

const part = (kind, extra = {}) => ({part_kind: kind, ...extra})

const history = [
  {
    kind: 'request',
    parts: [
      part('system-prompt', {content: 'You are a genealogy assistant.'}),
      part('user-prompt', {content: 'How am I related to X?'}),
    ],
  },
  {
    kind: 'response',
    timestamp: '2026-10-31T10:00:00Z',
    parts: [
      part('thinking', {content: 'hmm'}),
      part('text', {content: 'Let me search...'}),
      part('tool-call', {tool_name: 'search', args: {}}),
    ],
  },
  {
    kind: 'request',
    parts: [part('tool-return', {content: 'x'.repeat(50000)})],
  },
  {
    kind: 'response',
    parts: [part('builtin-tool-call'), part('builtin-tool-return')],
  },
  {
    kind: 'request',
    parts: [part('retry-prompt', {content: 'retry'})],
  },
  {
    kind: 'response',
    timestamp: '2026-10-31T10:00:05Z',
    parts: [part('text', {content: 'X is your [cousin](/person/I0123).'})],
  },
  {
    kind: 'request',
    parts: [part('user-prompt', {content: 'That is wrong.'})],
  },
]

describe('stripChatHistoryRaw', () => {
  const stripped = JSON.parse(stripChatHistoryRaw(JSON.stringify(history)))

  it('keeps only system prompt, user prompts and text parts', () => {
    const kinds = stripped.flatMap(msg => msg.parts.map(p => p.part_kind))
    expect(kinds).toEqual([
      'system-prompt',
      'user-prompt',
      'text',
      'user-prompt',
    ])
  })

  it('keeps the final text of each assistant turn in order', () => {
    expect(stripped.map(msg => msg.kind)).toEqual([
      'request',
      'response',
      'request',
    ])
    expect(stripped[1]).toEqual({
      kind: 'response',
      timestamp: '2026-10-31T10:00:05Z',
      parts: [part('text', {content: 'X is your [cousin](/person/I0123).'})],
    })
  })

  it('never leaves two responses in a row', () => {
    for (let i = 1; i < stripped.length; i += 1) {
      expect(
        stripped[i].kind === 'response' && stripped[i - 1].kind === 'response'
      ).toBe(false)
    }
  })

  it('returns invalid JSON unchanged', () => {
    expect(stripChatHistoryRaw('not json{')).toBe('not json{')
  })

  it('returns non-array JSON unchanged', () => {
    expect(stripChatHistoryRaw('{"a": 1}')).toBe('{"a": 1}')
  })
})
