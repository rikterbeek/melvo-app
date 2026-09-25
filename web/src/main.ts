/**
 * The homepage is static; the only behaviour is the phone navigation toggle.
 * It is progressive enhancement — the markup ships with the nav closed and the
 * button labelled, so a failed script leaves the in-page anchors reachable
 * from the footer navigation.
 */

function setupNavigationToggle(root: Document = document): void {
  const toggle = root.querySelector<HTMLButtonElement>('.nav-toggle')
  const nav = toggle?.getAttribute('aria-controls')
    ? root.getElementById(toggle.getAttribute('aria-controls')!)
    : null
  if (!toggle || !nav) return

  const setOpen = (open: boolean): void => {
    toggle.setAttribute('aria-expanded', String(open))
    nav.dataset['open'] = String(open)
  }

  setOpen(false)
  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true')
  })

  // Following an in-page link should close the menu and hand focus to the target.
  nav.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) setOpen(false)
  })

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false)
      toggle.focus()
    }
  })
}

setupNavigationToggle()

export { setupNavigationToggle }
