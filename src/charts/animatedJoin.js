import {local} from 'd3-selection'

// The key each element was last joined with
const joinKey = local()

// Returns the key an element was last joined with
export function keyOf(element) {
  return joinKey.get(element)
}

// Returns the position of an element from its translate transform, also
// while a transition moves it
export function elementPosition(element) {
  const match = /translate\(([^,]+),([^)]+)\)/.exec(
    element.getAttribute('transform')
  )
  return [Number(match[1]), Number(match[2])]
}

// Returns the translate transform for a position, in the format that
// `elementPosition` reads
export const translate = ([x, y]) => `translate(${x},${y})`

// Returns a function that interpolates linearly from point `a` to point `b`
export const interpolatePoint = (a, b) => t =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

// Moves each element to `position(d)`. With a `duration`, elements move there
// from `start(d)`. Interpolating the points keeps the transform in the format
// that `elementPosition` reads while they move.
export function moveElements(elements, {position, start, duration = 0}) {
  if (duration > 0) {
    elements
      .attr('transform', d => translate(start(d)))
      .transition()
      .duration(duration)
      .attrTween('transform', d => {
        const point = interpolatePoint(start(d), position(d))
        return t => translate(point(t))
      })
  } else {
    elements.attr('transform', d => translate(position(d)))
  }
}

// Returns the current position of each child of `parent` that matches
// `selector`, by the key it was joined with
export function currentPositions(parent, selector) {
  const positions = new Map()
  parent.selectChildren(selector).each(function () {
    positions.set(keyOf(this), elementPosition(this))
  })
  return positions
}

// Joins `data` to the children of `parent` that match `selector`, matching
// elements and data by `key(d)`. An element keeps the key it was joined with,
// so it is reused whenever that key is in `data` again, even with a different
// data object. `enter(selection)` appends and returns the new elements, and
// `exit(selection)` can move the leaving elements before they go.
//
// Leaving elements lose their classes, so that later joins ignore them, and
// are removed. With a `duration`, leaving elements fade out and new elements
// fade in; animating anything else is up to the caller. Transitions come from
// d3-transition, which d3-zoom loads. Returns the joined elements.
export function joinWithTransitions(
  parent,
  selector,
  data,
  {key, enter, exit = () => {}, duration = 0}
) {
  const parentNode = parent.node()
  let entering
  const elements = parent
    .selectChildren(selector)
    .data(data, function (d) {
      // d3 calls this with the parent for each new datum, and with each
      // existing element, whose datum is still the one from its last join
      return this === parentNode ? key(d) : keyOf(this)
    })
    .join(
      enterSelection => {
        entering = enter(enterSelection)
        return entering
      },
      update => update,
      exitSelection => {
        // A leaving element may still be moving or fading in
        exitSelection.interrupt().interrupt('fade')
        exit(exitSelection)
        // Leaving elements no longer respond to clicks or hovering
        exitSelection.attr('class', null).style('pointer-events', 'none')
        if (duration > 0) {
          exitSelection
            .transition()
            .duration(duration)
            .style('opacity', 0)
            .remove()
        } else {
          exitSelection.remove()
        }
      }
    )
    .each(function (d) {
      joinKey.set(this, key(d))
    })

  if (duration > 0) {
    entering
      .style('opacity', 0)
      .transition('fade')
      .duration(duration)
      .style('opacity', 1)
      .on('end', function () {
        this.style.removeProperty('opacity')
      })
  } else {
    elements.interrupt().interrupt('fade').style('opacity', null)
  }
  return elements
}
