/**
 * Inline images in StyledText notes.
 *
 * An inline image is a single U+FFFC (OBJECT REPLACEMENT CHARACTER) in the
 * note string, covered by a `link` tag whose value is
 * `gramps://Media/handle/<handle>`. Other Gramps clients see a link to the
 * media object.
 */

import {charSlice} from './charUtils.js'

export const IMAGE_PLACEHOLDER = '\uFFFC'

const MEDIA_LINK_RE = /^gramps:\/\/Media\/handle\/([^/#?]+)/

/** Return the media handle of a `gramps://Media/handle/…` link, or null. */
export function mediaHandleFromLink(value) {
  const m = MEDIA_LINK_RE.exec(value ?? '')
  return m ? m[1] : null
}

/** Return the `gramps://` link value for a media handle. */
export function mediaLink(handle) {
  return `gramps://Media/handle/${handle}`
}

/**
 * Return the handles of all inline images in a StyledText object, in order
 * of appearance and without duplicates.
 */
export function inlineImageHandles(styledText) {
  const string = styledText?.string ?? ''
  const found = []
  for (const tag of styledText?.tags ?? []) {
    if (tag.name !== 'link') continue
    const handle = mediaHandleFromLink(tag.value)
    if (!handle) continue
    for (const [start, end] of tag.ranges ?? []) {
      if (
        end - start === 1 &&
        charSlice(string, start, end) === IMAGE_PLACEHOLDER
      ) {
        found.push([start, handle])
      }
    }
  }
  found.sort((a, b) => a[0] - b[0])
  return [...new Set(found.map(([, handle]) => handle))]
}

/**
 * Fetch the media objects of the inline images in a StyledText object.
 * Returns an object mapping Gramps IDs to media objects; media that cannot
 * be fetched, e.g. private ones, are left out.
 */
export async function fetchInlineMedia(appState, styledText) {
  const handles = inlineImageHandles(styledText)
  const results = await Promise.all(
    handles.map(handle => appState.apiGet(`/api/media/${handle}`))
  )
  return Object.fromEntries(
    results
      .filter(res => res?.data?.gramps_id)
      .map(res => [res.data.gramps_id, res.data])
  )
}
