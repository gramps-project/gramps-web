// Part kinds of the pydantic-ai message history sent back to the backend.
// Tool calls and results can be very large, so only conversation text is kept.
// The system prompt must stay, since the backend reuses it from the history.
const KEEP_PARTS = new Set(['system-prompt', 'user-prompt', 'text'])

// Reduces a serialized pydantic-ai message history to the conversation text.
// Consecutive responses collapse to the last one, which holds the final answer.
// A blob that is not a valid JSON array is returned unchanged.
export function stripChatHistoryRaw(raw) {
  let messages
  try {
    messages = JSON.parse(raw)
  } catch (e) {
    return raw
  }
  if (!Array.isArray(messages)) {
    return raw
  }
  const result = []
  for (const msg of messages) {
    const parts = (msg?.parts ?? []).filter(p => KEEP_PARTS.has(p?.part_kind))
    if (parts.length > 0) {
      const prev = result[result.length - 1]
      if (prev?.kind === 'response' && msg.kind === 'response') {
        result[result.length - 1] = {...msg, parts}
      } else {
        result.push({...msg, parts})
      }
    }
  }
  return JSON.stringify(result)
}
