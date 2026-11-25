// Helpers for blog posts: sources tagged "Blog" whose publication date is
// stored as a source attribute.

import {intlLocale, makeHandle, toWritableObject} from './util.js'

// The source attribute type holding a post's date as "YYYY-MM-DD".
export const BLOG_DATE_ATTRIBUTE = 'Date'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

// The date in a "YYYY-MM-DD" string as a UTC Date, or null if the string
// is not a valid calendar date.
function parseIsoDate(value) {
  const match = ISO_DATE.exec(value?.trim?.() ?? '')
  if (!match) {
    return null
  }
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date
}

// The date in the local time zone as "YYYY-MM-DD", by default today's.
export function localIsoDate(date = new Date()) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`
}

// Whether a string is a valid "YYYY-MM-DD" calendar date.
export function isIsoDate(value) {
  return parseIsoDate(value) !== null
}

// The date attribute for a post published on the given "YYYY-MM-DD" date.
export function blogDateAttribute(value) {
  return {_class: 'SrcAttribute', type: BLOG_DATE_ATTRIBUTE, value}
}

// The attribute list with its date attributes replaced by one for the
// given "YYYY-MM-DD" date.
export function withBlogDate(attributeList, value) {
  return [
    ...(attributeList ?? []).filter(att => att.type !== BLOG_DATE_ATTRIBUTE),
    blogDateAttribute(value),
  ]
}

// The first note of a post that exists, from its extended notes.
export function blogPostNote(source) {
  const notes = source?.extended?.notes ?? []
  return (source?.note_list ?? [])
    .map(handle => notes.find(note => note?.handle === handle))
    .find(Boolean)
}

// A post's date as {date, utc}. It is the date attribute if the source has
// a valid one (a calendar date, so `utc` is true), else the source's last
// change time (a moment, shown in the local time zone).
export function blogPostDate(source) {
  const attr = (source?.attribute_list ?? []).find(
    att => att.type === BLOG_DATE_ATTRIBUTE && parseIsoDate(att.value)
  )
  if (attr) {
    return {date: parseIsoDate(attr.value), utc: true}
  }
  if (source?.change) {
    return {date: new Date(source.change * 1000), utc: false}
  }
  return null
}

// The day a post's date is shown on as "YYYY-MM-DD", or "" without a date.
export function blogPostIsoDate(source) {
  const postDate = blogPostDate(source)
  if (!postDate) {
    return ''
  }
  return postDate.utc
    ? postDate.date.toISOString().slice(0, 10)
    : localIsoDate(postDate.date)
}

// A post's date formatted for the given Gramps language code.
export function formatBlogPostDate(source, lang = 'en') {
  const postDate = blogPostDate(source)
  if (!postDate) {
    return ''
  }
  return postDate.date.toLocaleDateString(intlLocale(lang), {
    dateStyle: 'long',
    ...(postDate.utc ? {timeZone: 'UTC'} : {}),
  })
}

// The calendar day a post's date is shown on, as a UTC timestamp.
function blogPostDay(source) {
  const postDate = blogPostDate(source)
  if (!postDate) {
    return 0
  }
  const {date, utc} = postDate
  return utc
    ? date.getTime()
    : Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

// The posts sorted newest first by the day they are shown on; posts on the
// same day are ordered by their last change.
export function sortBlogPosts(sources) {
  return [...sources].sort(
    (a, b) =>
      blogPostDay(b) - blogPostDay(a) || (b.change ?? 0) - (a.change ?? 0)
  )
}

// The rules matching all blog posts.
export const blogRules = {rules: [{name: 'HasTag', values: ['Blog']}]}

// The rules matching the blog post with the given Gramps ID
export function blogPostRules(grampsId) {
  return {
    rules: [
      {name: 'HasIdOf', values: [grampsId]},
      {name: 'HasTag', values: ['Blog']},
    ],
  }
}

// The rules matching the sources with the given Gramps IDs.
export function grampsIdRules(grampsIds) {
  return {
    function: 'or',
    rules: grampsIds.map(id => ({name: 'HasIdOf', values: [id]})),
  }
}

// The tag list with the Blog tag
export function blogTagList(tagList, blogTagHandle) {
  return [...new Set([blogTagHandle, ...(tagList ?? [])].filter(Boolean))]
}

// The source properties set by the form of a post, from its data
function blogSourceProps(data, attributeList, blogTagHandle) {
  return {
    title: data.title.trim(),
    author: data.author,
    private: Boolean(data.private),
    tag_list: blogTagList(data.tag_list, blogTagHandle),
    media_list: data.media_list,
    attribute_list: withBlogDate(attributeList, data.date),
  }
}

const hasText = text => Boolean(text?.string?.trim())

// The objects adding a post from the data of its form: the source, and the
// note with its text if it has one
export function newBlogPostObjects(data, blogTagHandle) {
  const source = {
    _class: 'Source',
    handle: makeHandle(),
    ...blogSourceProps(data, [], blogTagHandle),
  }
  if (!hasText(data.text)) {
    return [source]
  }
  const note = {
    _class: 'Note',
    handle: makeHandle(),
    text: data.text,
    tag_list: source.tag_list,
    private: source.private,
  }
  return [{...source, note_list: [note.handle]}, note]
}

// The requests saving the data of the form to a post, as [{method, url,
// data}] in order. `source` and `note` are the post and its note as saved,
// the note null without one. A post without a note gets one for its text,
// added before the post refers to it. When the post's privacy changes, the
// note follows it, before the post becomes private and after it becomes
// public, so a failed request never leaves the text more public than the
// post; otherwise the note keeps its own privacy.
export function blogPostSaveRequests(source, note, data, blogTagHandle) {
  const writable = toWritableObject(source)
  const updated = {
    _class: 'Source',
    ...writable,
    ...blogSourceProps(data, writable.attribute_list, blogTagHandle),
  }
  const putSource = () => ({
    method: 'PUT',
    url: `/api/sources/${updated.handle}`,
    data: updated,
  })
  if (!note) {
    if (!hasText(data.text)) {
      return [putSource()]
    }
    const newNote = {
      _class: 'Note',
      handle: makeHandle(),
      text: data.text,
      tag_list: updated.tag_list,
      private: updated.private,
    }
    updated.note_list = [...(updated.note_list ?? []), newNote.handle]
    return [{method: 'POST', url: '/api/notes/', data: newNote}, putSource()]
  }
  const privacyChanged = Boolean(source.private) !== updated.private
  const noteNew = {
    _class: 'Note',
    ...toWritableObject(note),
    text: data.text,
    private: privacyChanged ? updated.private : Boolean(note.private),
  }
  if (
    JSON.stringify(noteNew.text) === JSON.stringify(note.text) &&
    Boolean(note.private) === noteNew.private
  ) {
    return [putSource()]
  }
  const putNote = {
    method: 'PUT',
    url: `/api/notes/${noteNew.handle}`,
    data: noteNew,
  }
  return privacyChanged && updated.private
    ? [putNote, putSource()]
    : [putSource(), putNote]
}

// The requests saving the media objects whose privacy was changed in the
// form of a post, for the media the post still refers to
export function blogMediaRequests(data) {
  const handles = new Set((data.media_list ?? []).map(ref => ref.ref))
  return (data.media_updates ?? [])
    .filter(media => handles.has(media.handle))
    .map(media => ({
      method: 'PUT',
      url: `/api/media/${media.handle}`,
      data: media,
    }))
}
