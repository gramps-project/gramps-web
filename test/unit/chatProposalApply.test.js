import {describe, it, expect, vi, afterEach} from 'vitest'
import '../../src/components/GrampsjsChat.js'
import '../../src/components/GrampsjsChatProposal.js'

const transaction = [
  {
    type: 'add',
    _class: 'Note',
    handle: 'N1',
    old: null,
    new: {
      _class: 'Note',
      handle: 'N1',
      gramps_id: 'N0001',
      text: {_class: 'StyledText', string: 'A note', tags: []},
    },
  },
]

const proposal = id => ({summary: ['Add note'], transaction, id})

function makeChat(apiPost) {
  const chat = document.createElement('grampsjs-chat')
  chat.appState = {apiPost}
  chat.messages = [
    {role: 'ai', message: 'First', proposal: proposal('a')},
    {role: 'ai', message: 'Second', proposal: proposal('b')},
    {
      role: 'ai',
      message: 'Third',
      proposal: proposal('c'),
      proposalStatus: 'applied',
    },
    {role: 'human', message: 'Thanks'},
  ]
  return chat
}

const statuses = chat => chat.messages.map(m => m.proposalStatus ?? '')

describe('the AI message of a chat result', () => {
  it('carries a proposal with an ID of its own', () => {
    const chat = document.createElement('grampsjs-chat')
    const message = chat._aiMessage({
      response: 'I propose a note.',
      proposal: {summary: ['Add note'], transaction},
    })
    expect(message.proposal.transaction).toBe(transaction)
    expect(message.proposal.id).toMatch(/\S+/)
  })

  it('has no proposal without changes', () => {
    const chat = document.createElement('grampsjs-chat')
    expect(chat._aiMessage({response: 'Hi'}).proposal).toBeUndefined()
    expect(
      chat._aiMessage({response: 'Hi', proposal: {transaction: []}}).proposal
    ).toBeUndefined()
  })
})

describe('applying a proposal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('replays the transaction and outdates the other open proposals', async () => {
    const apiPost = vi.fn().mockResolvedValue({data: transaction})
    const chat = makeChat(apiPost)
    const undo = vi.fn()
    chat.addEventListener('transaction:undo', undo)
    await chat._applyProposal(chat.messages[1].proposal)

    expect(apiPost).toHaveBeenCalledWith(
      '/api/transactions/?message=Changes%20proposed%20by%20the%20assistant',
      transaction
    )
    expect(statuses(chat)).toEqual(['outdated', 'applied', 'applied', ''])
    expect(undo.mock.calls[0][0].detail).toEqual({
      message: 'Changes applied',
      transaction,
      redirect: 'chat',
    })
    expect(chat._applyingProposal).toBe('')
  })

  it('marks a proposal the backend rejects as outdated', async () => {
    const apiPost = vi.fn().mockResolvedValue({
      error: 'Object has changed',
      errorDetail: {status: 400},
    })
    const chat = makeChat(apiPost)
    const error = vi.fn()
    chat.addEventListener('grampsjs:error', error)
    await chat._applyProposal(chat.messages[0].proposal)

    expect(error).toHaveBeenCalledOnce()
    expect(statuses(chat)).toEqual(['outdated', '', 'applied', ''])
  })

  it('keeps a proposal open after an error that may pass', async () => {
    const apiPost = vi.fn().mockResolvedValue({
      error: 'Failed to fetch',
      errorDetail: {status: undefined},
    })
    const chat = makeChat(apiPost)
    await chat._applyProposal(chat.messages[0].proposal)
    expect(statuses(chat)).toEqual(['', '', 'applied', ''])
  })

  it('applies one proposal at a time', async () => {
    let resolvePost
    const apiPost = vi.fn(
      () =>
        new Promise(resolve => {
          resolvePost = resolve
        })
    )
    const chat = makeChat(apiPost)
    const first = chat._applyProposal(chat.messages[0].proposal)
    await chat._applyProposal(chat.messages[1].proposal)
    resolvePost({data: transaction})
    await first
    expect(apiPost).toHaveBeenCalledOnce()
    expect(statuses(chat)).toEqual(['applied', 'outdated', 'applied', ''])
  })

  it('applies nothing while the assistant answers', async () => {
    const apiPost = vi.fn()
    const chat = makeChat(apiPost)
    chat.loading = true
    await chat._applyProposal(chat.messages[0].proposal)
    expect(apiPost).not.toHaveBeenCalled()
    expect(statuses(chat)).toEqual(['', '', 'applied', ''])
  })

  it('is busy while the assistant answers or a proposal is applied', async () => {
    let resolvePost
    const apiPost = vi.fn(
      () =>
        new Promise(resolve => {
          resolvePost = resolve
        })
    )
    const chat = makeChat(apiPost)
    expect(chat._busy).toBe(false)
    chat.loading = true
    expect(chat._busy).toBe(true)
    chat.loading = false
    const applying = chat._applyProposal(chat.messages[0].proposal)
    expect(chat._busy).toBe(true)
    resolvePost({data: transaction})
    await applying
    expect(chat._busy).toBe(false)
  })

  it('keeps a status set while the answer is still shown word by word', async () => {
    vi.useFakeTimers()
    const chat = document.createElement('grampsjs-chat')
    chat.messages = []
    const adding = chat._addMessage(
      {role: 'ai', message: 'One two three', proposal: proposal('a')},
      6
    )
    chat._setProposalStatus('a', 'applied')
    await vi.runAllTimersAsync()
    await adding
    vi.useRealTimers()
    expect(chat.messages).toEqual([
      {
        role: 'ai',
        message: 'One two three',
        proposal: proposal('a'),
        proposalStatus: 'applied',
        proposalUnreported: true,
      },
    ])
  })
})

describe('telling the assistant about its proposals', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('reports an apply once, also after a later answer', async () => {
    vi.useFakeTimers()
    const apiPost = vi.fn(url =>
      Promise.resolve(
        url.startsWith('/api/transactions/')
          ? {data: transaction}
          : {data: {response: 'Yes'}}
      )
    )
    const chat = document.createElement('grampsjs-chat')
    chat.appState = {apiPost}
    chat.messages = [
      {role: 'ai', message: 'First', proposal: proposal('a')},
      {role: 'human', message: 'Who is she?'},
      {role: 'ai', message: 'Jane'},
    ]
    const ask = async message => {
      chat._handlePrompt({detail: {message}})
      await vi.runAllTimersAsync()
      return apiPost.mock.lastCall[1]
    }

    await chat._applyProposal(chat.messages[0].proposal)
    expect((await ask('Did I apply it?')).previous_proposal).toBe('applied')
    expect((await ask('And now?')).previous_proposal).toBeUndefined()
  })
})
