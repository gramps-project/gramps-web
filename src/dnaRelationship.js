/*
Relationship estimate from shared autosomal DNA segments, following ERSA:
Huff CD et al., Maximum-likelihood estimation of recent shared ancestry
(ERSA), Genome Research 21:768-774 (2011), doi:10.1101/gr.115972.110

A relationship class has d meioses along the path through the common
ancestors and a in {1, 2} common ancestors. The number of shared segments
longer than the detection threshold t is Poisson with mean

  lambda_t = a (r d + c) / 2^(d-1) * exp(-d t / 100)

and the length x of each segment longer than t has the density

  f(x) = d / 100 * exp(-d (x - t) / 100).

Parent/child and full siblings are outside that model. As in the paper,
parent and child are recognized by the shared fraction of the autosomes in
base pairs (coverage): they share about all of it, full siblings about 3/4
with a standard deviation of about 0.04, so a coverage above 0.85 is beyond
the 0.01 significance level for full siblings.

The full sibling equations of the paper's supplement do not separate full
from half siblings with half-identical segments only, as consumer tests
report them. The coverage separates full siblings (about 3/4) from
the other second-degree relatives (about 1/2, standard deviation up to about
0.07 after Hill and Weir 2011): the probability of degree 2 is split between
them by the likelihood of the coverage under a normal approximation.

The model has no background IBD from the population, so it does not
calibrate very distant relationships.
*/

import {apiVersionAtLeast} from './util.js'

// Expected recombinations per haploid genome per generation
export const RECOMBINATIONS = 35.3
export const AUTOSOMES = 22
// Detection threshold in cM; lowered below the shortest segment if needed
export const DEFAULT_THRESHOLD = 7
export const MAX_MEIOSES = 14
// Degrees from this one on are shown as one group
export const MAX_DEGREE = 9
// The tree relationship is flagged below this likelihood ratio
export const CONFLICT_RATIO = 0.01
// Parent and child share more than this fraction of the autosomes
export const PARENT_CHILD_COVERAGE = 0.85
// Coverage under a normal approximation: mean and standard deviation
const FULL_SIBLING_COVERAGE = {mean: 0.75, sd: 0.04}
const SECOND_DEGREE_COVERAGE = {mean: 0.5, sd: 0.07}

// Autosome lengths in base pairs (GRCh37), which consumer tests report
const AUTOSOME_BP = [
  249250621, 243199373, 198022430, 191154276, 180915260, 171115067, 159138663,
  146364022, 141213431, 135534747, 135006516, 133851895, 115169878, 107349540,
  102531392, 90354753, 81195210, 78077248, 59128983, 63025520, 48129895,
  51304566,
]
const TOTAL_AUTOSOME_BP = AUTOSOME_BP.reduce((sum, bp) => sum + bp, 0)

// Display groups besides the degrees
export const PARENT_CHILD = 'parent'
export const FULL_SIBLING = 'sibling'

// The genetic degree of relationship: half siblings, grandparents and
// aunts/uncles are second degree, first cousins third degree.
export function degreeOf(d, a) {
  return d - a + 1
}

export function isModeled(d, a) {
  return Number.isInteger(d) && d >= 2 && (a === 1 || (a === 2 && d >= 3))
}

// The display group of the relationship with d meioses and a common
// ancestors, or null if it has none
export function groupOf(d, a) {
  if (d === 1) {
    return PARENT_CHILD
  }
  if (d === 2 && a === 2) {
    return FULL_SIBLING
  }
  if (isModeled(d, a)) {
    return Math.min(degreeOf(d, a), MAX_DEGREE)
  }
  return null
}

export const RELATIONSHIP_CLASSES = Array.from(
  {length: MAX_MEIOSES - 1},
  (_, i) => i + 2
)
  .flatMap(d => [
    {d, a: 1},
    {d, a: 2},
  ])
  .filter(({d, a}) => isModeled(d, a))

// The autosome number of a chromosome label such as "7" or "chr7", or null
function autosomeNumber(chromosome) {
  const label = String(chromosome).trim().toUpperCase().replace(/^CHR/, '')
  const number = Number(label)
  return Number.isInteger(number) && number >= 1 && number <= AUTOSOMES
    ? number
    : null
}

function isAutosome(chromosome) {
  return autosomeNumber(chromosome) !== null
}

// A segment position in base pairs; NaN when it is missing or blank
function position(value) {
  return value === null || value === undefined || String(value).trim() === ''
    ? NaN
    : Number(value)
}

// Lengths in cM of the autosomal segments that have a positive length
export function autosomalLengths(segments) {
  return (segments ?? [])
    .filter(seg => isAutosome(seg.chromosome))
    .map(seg => Number(seg.cM))
    .filter(cM => Number.isFinite(cM) && cM > 0)
}

// Shared fraction of the autosomes in base pairs, or null when a segment has
// no usable positions. Overlapping segments, such as the same match imported
// from two companies, count once.
export function autosomalCoverage(segments) {
  const intervals = (segments ?? [])
    .filter(seg => isAutosome(seg.chromosome))
    .map(seg => ({
      chromosome: autosomeNumber(seg.chromosome),
      start: position(seg.start),
      stop: position(seg.stop),
    }))
  if (
    intervals.length === 0 ||
    intervals.some(
      ({start, stop}) =>
        !Number.isFinite(start) || !Number.isFinite(stop) || stop <= start
    )
  ) {
    return null
  }
  intervals.sort((a, b) => a.chromosome - b.chromosome || a.start - b.start)
  let bp = 0
  let current = null
  for (const interval of intervals) {
    if (
      current &&
      interval.chromosome === current.chromosome &&
      interval.start <= current.stop
    ) {
      current.stop = Math.max(current.stop, interval.stop)
    } else {
      if (current) {
        bp += current.stop - current.start
      }
      current = {...interval}
    }
  }
  bp += current.stop - current.start
  return bp / TOTAL_AUTOSOME_BP
}

function logFactorial(n) {
  let result = 0
  for (let k = 2; k <= n; k += 1) {
    result += Math.log(k)
  }
  return result
}

function logPoisson(n, lambda) {
  return n * Math.log(lambda) - lambda - logFactorial(n)
}

export function expectedSegments(d, a, threshold) {
  return (
    ((a * (RECOMBINATIONS * d + AUTOSOMES)) / 2 ** (d - 1)) *
    Math.exp((-d * threshold) / 100)
  )
}

// Log-likelihood of segment lengths (cM, all longer than the threshold)
export function logLikelihood(lengths, threshold, d, a) {
  const n = lengths.length
  const rate = d / 100
  const excess = lengths.reduce((sum, x) => sum + (x - threshold), 0)
  return (
    logPoisson(n, expectedSegments(d, a, threshold)) +
    n * Math.log(rate) -
    rate * excess
  )
}

function logNormal(x, {mean, sd}) {
  return -0.5 * ((x - mean) / sd) ** 2 - Math.log(sd)
}

function logSumExp(values) {
  const max = Math.max(...values)
  return max + Math.log(values.reduce((sum, v) => sum + Math.exp(v - max), 0))
}

/*
Estimate the relationship from DNA match segments.

Returns null without autosomal segments. Otherwise, `groups` holds the
posterior probability of each display group (PARENT_CHILD, FULL_SIBLING or a
degree from 2 to MAX_DEGREE, the last one standing for that degree or more
distant) under a uniform prior over the relationship classes, most probable
first. Without segment positions there is no coverage, so neither parent and
child nor full siblings are recognized.
*/
export function estimateRelationship(
  segments,
  {threshold = DEFAULT_THRESHOLD} = {}
) {
  const lengths = autosomalLengths(segments)
  if (lengths.length === 0) {
    return null
  }
  const coverage = autosomalCoverage(segments)
  const parentChild = coverage !== null && coverage > PARENT_CHILD_COVERAGE
  const t = Math.min(threshold, ...lengths)
  const classes = parentChild
    ? []
    : RELATIONSHIP_CLASSES.map(({d, a}) => ({
        d,
        a,
        group: groupOf(d, a),
        logL: logLikelihood(lengths, t, d, a),
      }))
  // log-likelihood ratio of the coverage for full siblings against the
  // other second-degree relatives
  const siblingLogRatio =
    coverage === null
      ? null
      : logNormal(coverage, FULL_SIBLING_COVERAGE) -
        logNormal(coverage, SECOND_DEGREE_COVERAGE)
  let groups = [{group: PARENT_CHILD, probability: 1}]
  if (!parentChild) {
    const logTotal = logSumExp(classes.map(c => c.logL))
    const byGroup = new Map()
    for (const c of classes) {
      byGroup.set(
        c.group,
        (byGroup.get(c.group) ?? 0) + Math.exp(c.logL - logTotal)
      )
    }
    if (siblingLogRatio !== null) {
      const share = 1 / (1 + Math.exp(-siblingLogRatio))
      const secondDegree = byGroup.get(2) ?? 0
      byGroup.set(FULL_SIBLING, secondDegree * share)
      byGroup.set(2, secondDegree * (1 - share))
    }
    groups = [...byGroup.entries()]
      .map(([group, probability]) => ({group, probability}))
      .sort((x, y) => y.probability - x.probability)
  }
  return {
    threshold: t,
    lengths,
    coverage,
    parentChild,
    siblingLogRatio,
    classes,
    groups,
    maxLogL: Math.max(...classes.map(c => c.logL)),
  }
}

/*
Compare the relationship in the tree (d meioses, a common ancestors) with
the estimate. Returns null if the tree relationship cannot be checked.

Groups are compared: `ratio` is the likelihood of the best class in the
group of the tree relationship divided by the likelihood of the best class
overall, so it is at most 1. Classes of one degree, such as half siblings
and aunt/niece, differ too little in the model to tell apart. For full
siblings and the other second-degree relatives, the ratio includes the
likelihood ratio of the coverage. Parent and child are recognized by the
coverage alone, so there is no ratio for them.
*/
export function checkTreeRelationship(estimate, d, a) {
  const group = groupOf(d, a)
  if (!estimate || group === null) {
    return null
  }
  if (estimate.parentChild || group === PARENT_CHILD) {
    if (estimate.coverage === null) {
      return null
    }
    const conflict = estimate.parentChild !== (group === PARENT_CHILD)
    return {group, ratio: null, conflict}
  }
  if (group === FULL_SIBLING && estimate.siblingLogRatio === null) {
    return null
  }
  // full siblings are second-degree in the segment model
  const segmentGroup = group === FULL_SIBLING ? 2 : group
  const classLogL = estimate.classes
    .filter(c => c.group === segmentGroup)
    .map(c => c.logL)
  if (group !== FULL_SIBLING) {
    classLogL.push(logLikelihood(estimate.lengths, estimate.threshold, d, a))
  }
  const segmentLogL = Math.max(...classLogL)
  let logRatio = segmentLogL - Math.max(segmentLogL, estimate.maxLogL)
  if (segmentGroup === 2 && estimate.siblingLogRatio !== null) {
    const r = estimate.siblingLogRatio
    logRatio += group === FULL_SIBLING ? Math.min(r, 0) : Math.min(-r, 0)
  }
  const ratio = Math.exp(logRatio)
  return {group, ratio, conflict: ratio < CONFLICT_RATIO}
}

// The DNA matches endpoint returns the tree distance of each match from
// Gramps Web API 3.26 on
export function supportsRelationshipEstimate(dbInfo) {
  return apiVersionAtLeast(dbInfo, 3, 26)
}

/*
Estimate for a match from the DNA matches endpoint. The match holds the
number of meioses between the two people in the tree (`distance`, null if
they are not related) and their common ancestors.
*/
export function matchRelationshipEstimate(match) {
  const estimate = estimateRelationship(match?.segments)
  // An ancestor reached by several paths is listed once per path
  const ancestors = Math.min(new Set(match?.ancestor_handles ?? []).size, 2)
  const check = match?.distance
    ? checkTreeRelationship(estimate, match.distance, ancestors)
    : null
  return {estimate, check}
}

// A likelihood ratio below 1 as "1 : n", rounded to two significant digits
export function formatLikelihoodRatio(ratio, locale = 'en') {
  const format = new Intl.NumberFormat(locale, {maximumSignificantDigits: 2})
  return `1 : ${format.format(1 / ratio)}`
}

// The translated warning for a tree relationship that does not fit, with
// the likelihood ratio if there is one
export function conflictWarning(check, translate, locale = 'en') {
  const text = translate(
    'The shared DNA is unlikely for the relationship in the tree.'
  )
  return check.ratio === null
    ? text
    : `${text} (${formatLikelihoodRatio(check.ratio, locale)})`
}

// Shared DNA in percent of both chromosome copies, as testing companies
// report it, or null without segment positions
export function sharedPercent(segments) {
  const coverage = autosomalCoverage(segments)
  return coverage === null ? null : coverage / 2
}

// The translated label of a display group
export function groupLabel(group, translate) {
  if (group === PARENT_CHILD) {
    return translate('Parent or child')
  }
  if (group === FULL_SIBLING) {
    return translate('Full sibling')
  }
  return translate(
    'Relative of degree %s',
    group >= MAX_DEGREE ? `${MAX_DEGREE}+` : String(group)
  )
}
