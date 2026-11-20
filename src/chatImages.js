import {apiVersionAtLeast} from './util.js'

// The backend accepts at most this many images per query
export const MAX_CHAT_IMAGES = 4

// The backend downscales images to this long edge, so larger ones would only
// make the upload slower
const MAX_EDGE = 1568
const QUALITY = 0.85

// Long edge of the preview shown in the prompt and the conversation
const THUMBNAIL_EDGE = 240
const THUMBNAIL_QUALITY = 0.8

// Whether images can be attached to chat queries (Gramps Web API 3.26 on)
export function chatVisionAvailable(dbInfo) {
  return apiVersionAtLeast(dbInfo, 3, 26) && !!dbInfo?.server?.chat_vision
}

// Size of an image whose long edge is at most maxEdge, keeping its aspect
// ratio; smaller images keep their size
export function scaledSize(width, height, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function toJpegDataUrl(bitmap, maxEdge, quality) {
  const {width, height} = scaledSize(bitmap.width, bitmap.height, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  // JPEG has no transparency
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

// Reads an image file into a JPEG data URL to upload and a small one to
// display. Throws if the browser cannot decode the file.
export async function readChatImage(file) {
  const bitmap = await createImageBitmap(file)
  try {
    return {
      data: toJpegDataUrl(bitmap, MAX_EDGE, QUALITY),
      thumbnail: toJpegDataUrl(bitmap, THUMBNAIL_EDGE, THUMBNAIL_QUALITY),
    }
  } finally {
    bitmap.close()
  }
}
