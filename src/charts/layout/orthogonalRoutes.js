// Right-angled routes for the links of a chart whose nodes lie in rows, with
// y pointing down. A link leaves its start downwards and reaches its end from
// above. Between two rows, and above the first and below the last, it runs
// along a horizontal leg; it goes through a row as a vertical line, at an x
// where the row has room for it.
//
// The legs of each gap are given heights as in channel routing: legs that
// would overlap get different tracks, and where a vertical line coming from
// above and one going down share an x, the first ends on a track above the
// second, so the two do not run into each other.

// Vertical distance in pixels between the horizontal lines in one gap, and
// from a row to the nearest line
export const trackSpacing = 10
export const gapMargin = 20

// Least horizontal distance in pixels between a vertical line through a row
// and the vertical lines of other links in the gaps on either side, and the
// furthest such a line moves aside for that. Graphviz keeps a distance of
// `nodesep`, 36 pixels, around each line through a row.
const lineSpacing = 5
const maxMove = 15

// Least horizontal distance in pixels between a vertical line that is moved
// to a new x in a row and what the row contains, and the lines through the
// row of other links
const rowClearance = 18

// Returns the number of tracks that `spans` need, giving each span the index
// of its `track`, counted from the top. Spans that would overlap or come
// closer than `trackSpacing` get different tracks, and each span lies above
// those in its `below`. Each track, from the top, takes spans from left to
// right that fit and whose spans above already have a track: the constrained
// left-edge algorithm. Spans that would each have to lie above the other
// take tracks in turn.
export function assignTracks(spans) {
  const above = new Map(spans.map(span => [span, []]))
  for (const span of spans) {
    for (const other of span.below ?? []) {
      above.get(other)?.push(span)
    }
  }
  let remaining = [...spans].sort(
    (a, b) => a.left - b.left || a.right - b.right
  )
  const placed = new Set()
  let track = 0
  while (remaining.length > 0) {
    let end = -Infinity
    const taken = []
    for (const span of remaining) {
      if (
        span.left >= end + trackSpacing &&
        above.get(span).every(other => placed.has(other))
      ) {
        span.track = track
        end = span.right
        taken.push(span)
      }
    }
    if (taken.length === 0) {
      remaining[0].track = track
      taken.push(remaining[0])
    }
    taken.forEach(span => placed.add(span))
    remaining = remaining.filter(span => !placed.has(span))
    track += 1
  }
  return track
}

// Returns the height a gap with `count` tracks needs
const neededHeight = count =>
  count === 0 ? 0 : 2 * gapMargin + (count - 1) * trackSpacing

// Returns the gaps of the legs of `link`, each with the x of the vertical
// lines that reach its leg from above, `tops`, and leave it downwards,
// `bottoms`, and the index of each line through a row: the line between leg
// `j - 1` and leg `j` has index `j`
function verticalLines(link) {
  const {start, end, legs} = link
  const lines = legs.map(() => ({tops: [], bottoms: []}))
  lines[0].tops.push({x: start.x})
  lines.at(-1).bottoms.push({x: end.x})
  for (let j = 1; j < legs.length; j += 1) {
    const line = {x: legs[j].from, index: j}
    const down = legs[j].gap > legs[j - 1].gap
    lines[j - 1][down ? 'bottoms' : 'tops'].push(line)
    lines[j][down ? 'tops' : 'bottoms'].push(line)
  }
  return lines
}

// Moves the lines through rows, which can move aside, so that each keeps
// `lineSpacing` from the lines of other links in the gaps on either side.
// Starts and ends of links stay where they are.
function moveLinesAside(links, lines) {
  const taken = new Map()
  const take = (gap, x, owner) => {
    if (!taken.has(gap)) {
      taken.set(gap, [])
    }
    taken.get(gap).push({x, owner})
  }
  const free = (gap, x, owner) =>
    (taken.get(gap) ?? []).every(
      other => other.owner === owner || Math.abs(other.x - x) >= lineSpacing
    )
  links.forEach((link, i) => {
    lines[i].forEach((line, j) => {
      for (const {x, index} of [...line.tops, ...line.bottoms]) {
        if (index === undefined) {
          take(link.legs[j].gap, x, i)
        }
      }
    })
  })
  const moves = []
  for (let move = 0; move <= maxMove; move += lineSpacing) {
    moves.push(move, -move)
  }
  links.forEach((link, i) => {
    for (let j = 1; j < link.legs.length; j += 1) {
      const [above, below] = [link.legs[j - 1], link.legs[j]]
      const x = below.from
      const move =
        moves.find(
          move => free(above.gap, x + move, i) && free(below.gap, x + move, i)
        ) ?? 0
      above.to = below.from = x + move
      take(above.gap, x + move, i)
      take(below.gap, x + move, i)
    }
  })
}

// Straightens links through several rows. Each line through a row moves to
// the x of the line after it, or of the link's end, where the row has room
// for it; failing that, to the x of the line before it, or of the link's
// start. Each such move takes away one horizontal leg.
function straighten(rows, links) {
  // The x of the lines through each row
  const lines = rows.map(() => [])
  const rowOf = (above, below) => Math.max(above.gap, below.gap)
  for (const {legs} of links) {
    for (let j = 1; j < legs.length; j += 1) {
      lines[rowOf(legs[j - 1], legs[j])].push(legs[j].from)
    }
  }
  const moveTo = (row, from, to) => {
    const others = [...lines[row]]
    others.splice(others.indexOf(from), 1)
    const room =
      (rows[row].blocked ?? [[-Infinity, Infinity]]).every(
        ([left, right]) =>
          to <= left - rowClearance || to >= right + rowClearance
      ) && others.every(x => Math.abs(x - to) >= rowClearance)
    if (room) {
      lines[row] = [...others, to]
    }
    return room
  }
  for (const {start, end, legs} of links) {
    const moved = new Set()
    for (let j = legs.length - 1; j >= 1; j -= 1) {
      const next = j === legs.length - 1 ? end.x : legs[j].to
      if (moveTo(rowOf(legs[j - 1], legs[j]), legs[j].from, next)) {
        legs[j - 1].to = legs[j].from = next
        moved.add(j)
      }
    }
    for (let j = 1; j < legs.length; j += 1) {
      const previous = j === 1 ? start.x : legs[j - 1].from
      if (
        !moved.has(j) &&
        moveTo(rowOf(legs[j - 1], legs[j]), legs[j].from, previous)
      ) {
        legs[j - 1].to = legs[j].from = previous
      }
    }
  }
}

// Routes `links` between `rows`, which are given from the top by the `top`
// and `bottom` of what they contain, and the `blocked` spans of x that it
// contains, each as `[left, right]`; without them, a row has no room for
// lines to move to. Gap `g` lies below row `g`; gap -1 lies above the first
// row.
//
// Each link has a `start` and an `end`, each with its `row`, `x` and `y`,
// and `legs`, each with its `gap` and the x it runs `from` and `to`. The
// first leg runs in the gap below the start row from the start's x, and the
// last in the gap above the end row to the end's x; each leg runs from the x
// the one before it ended at. The first legs of the links with the same
// `owner` share one line, such as the bar of a family over its children.
//
// Returns how far each row moves down to fit its tracks in `shifts`, and the
// points of each link's route in `routes`, in the moved rows. A route
// alternates vertical and horizontal lines, beginning and ending with a
// vertical one.
export function routeLinks(rows, links) {
  const routed = links.map(link => ({
    ...link,
    legs: link.legs.map(leg => ({...leg})),
  }))
  straighten(rows, routed)
  moveLinesAside(routed, routed.map(verticalLines))

  // The horizontal spans of each gap, by owner, with the x of the vertical
  // lines that reach them from above and leave them downwards
  const gaps = new Map()
  const legSpans = routed.map((link, i) =>
    verticalLines(link).map(({tops, bottoms}, j) => {
      const {gap, from, to} = link.legs[j]
      if (!gaps.has(gap)) {
        gaps.set(gap, new Map())
      }
      const spans = gaps.get(gap)
      const key = j === 0 ? `owner:${link.owner}` : `leg:${i}:${j}`
      const span = spans.get(key) ?? {
        left: Infinity,
        right: -Infinity,
        tops: [],
        bottoms: [],
        below: [],
      }
      span.left = Math.min(span.left, from, to)
      span.right = Math.max(span.right, from, to)
      span.tops.push(...tops.map(({x}) => x))
      span.bottoms.push(...bottoms.map(({x}) => x))
      spans.set(key, span)
      return span
    })
  )

  const counts = new Map()
  for (const [gap, byOwner] of gaps) {
    const spans = [...byOwner.values()]
    // A line from above ends above a line going down at the same x
    for (const span of spans) {
      span.below = spans.filter(
        other =>
          other !== span &&
          span.tops.some(x =>
            other.bottoms.some(y => Math.abs(x - y) < lineSpacing)
          )
      )
    }
    // A leg that only goes straight down needs no track of its own
    counts.set(gap, assignTracks(spans.filter(span => span.right > span.left)))
  }

  const shifts = [0]
  for (let row = 1; row < rows.length; row += 1) {
    const gap = row - 1
    const room = rows[row].top - rows[gap].bottom
    const needed = neededHeight(counts.get(gap) ?? 0)
    shifts.push(shifts[gap] + Math.max(0, needed - room))
  }

  const trackY = ({gap}, span) => {
    const count = counts.get(gap) ?? 0
    const track = span.track ?? 0
    if (gap < 0) {
      return rows[0].top - gapMargin - (count - 1 - track) * trackSpacing
    }
    const top = rows[gap].bottom + shifts[gap]
    if (gap === rows.length - 1) {
      return top + gapMargin + track * trackSpacing
    }
    const middle = (top + rows[gap + 1].top + shifts[gap + 1]) / 2
    return middle + (track - Math.max(0, count - 1) / 2) * trackSpacing
  }

  const routes = routed.map((link, i) => {
    const {start, end, legs} = link
    const points = [[start.x, start.y + shifts[start.row]]]
    legs.forEach((leg, j) => {
      const y = trackY(leg, legSpans[i][j])
      points.push([leg.from, y], [leg.to, y])
    })
    points.push([end.x, end.y + shifts[end.row]])
    return points
  })
  return {shifts, routes}
}
