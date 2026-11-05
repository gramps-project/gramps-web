/*
Tokenizer for the Gramps Object Query Language (GOQL), used for syntax
highlighting. GOQL is a whitelisted subset of Python expressions (see
query_lang.py in the gramps-object-query-language package), e.g.
`primary_name.surname_list[0].surname == "Smith" and not private`.

The tokenizer never fails: unknown characters become 'plain' tokens, and
joining the token texts always gives back the input.
*/

const KEYWORDS = new Set(['and', 'or', 'not', 'in', 'is'])
// only used in comprehensions, e.g. `any(c.private for c in children)`
const CONTROL_KEYWORDS = new Set(['for', 'if'])
const CONSTANTS = new Set(['True', 'False', 'None'])
// classes whose ALL_CAPS attributes are value constants, e.g. `Person.MALE`
const CONSTANT_CLASSES = new Set([
  'Person',
  'Citation',
  'Note',
  'Date',
  'AttributeType',
  'ChildRefType',
  'EventRoleType',
  'EventType',
  'FamilyRelType',
  'MarkerType',
  'NameOriginType',
  'NameType',
  'NoteType',
  'PlaceType',
  'RepositoryType',
  'SourceMediaType',
  'SrcAttributeType',
  'StyledTextTagType',
  'UrlType',
])

const OPENING_BRACKETS = {')': '(', ']': '[', '}': '{'}

const TOKEN_PATTERNS = [
  ['whitespace', /^\s+/],
  ['string', /^[rR]?(?:"(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?)/],
  ['number', /^(?:\d[\d_]*(?:\.\d[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?/],
  ['word', /^[\p{L}_][\p{L}\p{N}_]*/u],
  ['operator', /^(?:==|!=|<=|>=|<|>|-)/],
  ['bracket', /^[()[\]{}]/],
  ['punctuation', /^[.,:]/],
]

/**
 * Split a GOQL expression into tokens.
 * @param {string} text
 * @returns {{type: string, text: string, depth?: number}[]} type is one of
 * whitespace, string, number, keyword, control, constant, function, type,
 * enum, variable, operator, bracket, punctuation, plain; brackets carry their
 * nesting depth
 */
export function tokenizeGoql(text) {
  const tokens = []
  const openBrackets = []
  let rest = text
  while (rest.length > 0) {
    let token = {type: 'plain', text: rest[0]}
    for (const [type, pattern] of TOKEN_PATTERNS) {
      const match = pattern.exec(rest)
      if (match) {
        token = {type, text: match[0]}
        break
      }
    }
    if (token.type === 'bracket') {
      token = matchBracket(token, openBrackets)
    }
    tokens.push(token)
    rest = rest.slice(token.text.length)
  }
  return tokens.map((token, i) =>
    token.type === 'word' ? {...token, type: classifyWord(tokens, i)} : token
  )
}

// Opening brackets get the depth they open, closing ones the depth of their
// partner; a closing bracket without a partner is plain text
function matchBracket(token, openBrackets) {
  const opening = OPENING_BRACKETS[token.text]
  if (opening === undefined) {
    openBrackets.push(token.text)
    return {...token, depth: openBrackets.length - 1}
  }
  if (openBrackets[openBrackets.length - 1] !== opening) {
    return {...token, type: 'plain'}
  }
  openBrackets.pop()
  return {...token, depth: openBrackets.length}
}

// index of the closest token in the given direction that isn't whitespace
function neighbourIndex(tokens, i, step) {
  for (let j = i + step; j >= 0 && j < tokens.length; j += step) {
    if (tokens[j].type !== 'whitespace') {
      return j
    }
  }
  return -1
}

function classifyWord(tokens, i) {
  const {text} = tokens[i]
  const prevIndex = neighbourIndex(tokens, i, -1)
  const prev = tokens[prevIndex]
  const next = tokens[neighbourIndex(tokens, i, 1)]
  const afterDot = prev?.text === '.'
  if (!afterDot) {
    if (KEYWORDS.has(text)) return 'keyword'
    if (CONTROL_KEYWORDS.has(text)) return 'control'
    if (CONSTANTS.has(text)) return 'constant'
    if (CONSTANT_CLASSES.has(text) && next?.text === '.') return 'type'
  }
  if (next?.text === '(') return 'function'
  if (afterDot && /^[A-Z][A-Z0-9_]*$/.test(text)) {
    const owner = tokens[neighbourIndex(tokens, prevIndex, -1)]
    if (owner?.type === 'word' && CONSTANT_CLASSES.has(owner.text)) {
      return 'enum'
    }
  }
  return 'variable'
}
