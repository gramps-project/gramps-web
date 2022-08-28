/*
Date utility functions
*/

// eslint-disable-next-line class-methods-use-this
export function toDate(dateVal) {
  try {
    return `${dateVal[2]}-${dateVal[1]}-${dateVal[0]}`
  } catch {
    return ''
  }
}
