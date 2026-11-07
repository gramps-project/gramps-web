import {describe, it, expect} from 'vitest'
import {appHref, handleAppLinkClick, isNewTabClick} from '../../src/util.js'

// Clicks a link with `init` and returns the click event and the `nav` events
function clickLink(init = {}) {
  const link = document.createElement('a')
  document.body.appendChild(link)
  const navs = []
  link.addEventListener('nav', e => navs.push(e.detail))
  link.addEventListener('click', e => handleAppLinkClick(e, 'person/I0001'))
  const event = new MouseEvent('click', {button: 0, cancelable: true, ...init})
  link.dispatchEvent(event)
  link.remove()
  return {event, navs}
}

describe('handleAppLinkClick', () => {
  it('goes to the page within the app on a plain left click', () => {
    const {event, navs} = clickLink()
    expect(event.defaultPrevented).toBe(true)
    expect(navs).toEqual([{path: 'person/I0001'}])
  })

  it.each([{ctrlKey: true}, {metaKey: true}, {shiftKey: true}, {button: 1}])(
    'leaves a click with %o to the browser',
    init => {
      const {event, navs} = clickLink(init)
      expect(event.defaultPrevented).toBe(false)
      expect(navs).toEqual([])
    }
  )
})

describe('appHref', () => {
  it('returns the URL of the app page', () => {
    expect(appHref('person/I0001')).toBe('/person/I0001')
  })
})

describe('isNewTabClick', () => {
  it('is false for a plain left click', () => {
    expect(isNewTabClick(new MouseEvent('click'))).toBe(false)
  })

  it.each([{ctrlKey: true}, {button: 2}])(
    'is true for a click with %o',
    init => {
      expect(isNewTabClick(new MouseEvent('click', init))).toBe(true)
    }
  )

  // The app's router handles a click with Alt as well
  it('is false for a click with Alt', () => {
    expect(isNewTabClick(new MouseEvent('click', {altKey: true}))).toBe(false)
  })
})
